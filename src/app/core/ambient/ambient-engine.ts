import { GRID, StepEvent, at, midiToHz, seq } from './notation';
import { LivePattern, Station } from './live-patterns';
import { STATION_PATTERNS } from './stations';
import {
  ARP,
  BASS,
  BPM,
  ChordDef,
  CLAP,
  HATS,
  HATS_GHOST,
  KICK,
  P,
  P_BRIDGE,
  PERC,
  SECTIONS,
  SectionName,
  SPARKLE_NOTES,
  STAB,
  SWING,
} from './score';

/** Croche en secondes (≈ 0,326 s à 92 BPM). */
const EIGHTH = 30 / BPM;
/** Durée d'une mesure (8 croches). */
const BAR = EIGHTH * 8;
/** Horizon de programmation audio (s) et période du timer JS (ms). */
const LOOKAHEAD = 0.15;
const TICK_MS = 25;

/** Un accord de pad vivant, à relâcher au changement suivant. */
interface PadVoice {
  gain: GainNode;
  sources: OscillatorNode[];
}

/**
 * Moteur de l'ambiance : séquenceur à lookahead (l'horloge JS ne fait que
 * programmer ~150 ms d'avance sur l'horloge audio — le swing vit dans
 * l'accumulateur de temps, jamais dans le timer), instruments éphémères
 * (un nœud par note, libéré via `onended`) et bus d'effets persistants.
 *
 * L'horloge tourne dans un petit Worker inline (les timers de Worker ne
 * sont pas bridés quand l'onglet est caché) avec repli sur setInterval.
 *
 * Instancié par la façade avec un AudioContext créé dans le geste
 * utilisateur ; `stop()` détruit tout (fondu puis fermeture du contexte).
 */
export class AmbientEngine {
  private master?: GainNode;
  private comp!: DynamicsCompressorNode;
  private duckGain!: GainNode;
  private padFilterIn!: BiquadFilterNode;
  private padFilters: BiquadFilterNode[] = [];
  private bassGain!: GainNode;
  private arpIn!: BiquadFilterNode;
  private kickGain!: GainNode;
  private hatIn!: BiquadFilterNode;
  private percIn!: BiquadFilterNode;
  private clapIn!: BiquadFilterNode;
  private stabGain!: GainNode;
  private sparkleGain!: GainNode;
  private noise!: AudioBuffer;

  private worker?: Worker;
  private workerUrl?: string;
  private timer?: ReturnType<typeof setInterval>;
  private stopped = false;

  // Patterns joués — initialisés depuis la partition (copies : la grille
  // cliquable les mute), remplaçables en direct par `score` et les pads.
  private patterns: Record<LivePattern, StepEvent[]> = {
    bass: [...BASS],
    kick: [...KICK],
    hats: [...HATS],
    ghost: [...HATS_GHOST],
    perc: [...PERC],
    arp: [...ARP],
    clap: [...CLAP],
    stab: [...STAB],
  };

  /** Derniers pas programmés — pour la tête de lecture du séquenceur visuel. */
  private stepTimes: { step: number; time: number }[] = [];

  // Prise d'analyse pour les visuels audio-réactifs.
  private analyser?: AnalyserNode;
  private levelBuf?: Float32Array<ArrayBuffer>;
  /** Instants (horloge audio) des derniers kicks programmés. */
  private kickTimes: number[] = [];

  // État du séquenceur.
  private step = 0;
  private bar = 0;
  private chordIdx = -1;
  private section: SectionName = 'A';
  /** Section décidée à l'avance (dernière mesure de la section en cours). */
  private nextSection: SectionName = 'A';
  private nextStepTime = 0;
  private cutoffBase = 750;
  private padVoices: PadVoice[] = [];
  private openHatUntil = 0;
  private sparkleUntil = 0;

  constructor(private readonly ctx: AudioContext) {}

  start(): void {
    // Défensif : iOS peut livrer un contexte « suspended » ou « interrupted ».
    void this.ctx.resume().catch(() => undefined);
    this.noise = this.makeNoise();
    this.buildGraph();
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.startClock();
    this.tick();
  }

  /** Remplace un pattern en direct — jette si la mini-notation est invalide. */
  setPattern(name: LivePattern, spec: string): void {
    this.patterns[name] = seq(spec);
  }

  /** Restaure la partition d'origine. */
  resetPatterns(): void {
    this.patterns = {
      bass: [...BASS],
      kick: [...KICK],
      hats: [...HATS],
      ghost: [...HATS_GHOST],
      perc: [...PERC],
      arp: [...ARP],
      clap: [...CLAP],
      stab: [...STAB],
    };
  }

  /** Les patterns joués — lecture directe pour le séquenceur visuel. */
  getPatterns(): Record<LivePattern, StepEvent[]> {
    return this.patterns;
  }

  /** Change de station : applique une partition alternative d'un bloc. */
  tuneTo(station: Station): void {
    if (station === 'circuit') {
      this.resetPatterns();
      return;
    }
    const patterns = STATION_PATTERNS[station];
    for (const name of Object.keys(patterns) as LivePattern[]) {
      this.setPattern(name, patterns[name]);
    }
  }

  /** Copie la partition d'un autre moteur (rendu hors-ligne de `rec`). */
  adoptPatterns(patterns: Record<LivePattern, StepEvent[]>): void {
    for (const name of Object.keys(this.patterns) as LivePattern[]) {
      this.patterns[name] = patterns[name].map((ev) => ({ ...ev }));
    }
  }

  /** Active/désactive un pas depuis la grille cliquable. */
  toggleStep(name: LivePattern, step: number): void {
    const events = this.patterns[name];
    const idx = events.findIndex((e) => e.step === step);
    if (idx >= 0) {
      events.splice(idx, 1);
    } else {
      events.push({ step, offset: 0, vel: 0.9, lenSteps: 1 });
    }
  }

  /** Pas actuellement AUDIBLE (le séquenceur programme en avance), -1 au départ. */
  currentStep(): number {
    const now = this.ctx.currentTime;
    for (let i = this.stepTimes.length - 1; i >= 0; i--) {
      if (this.stepTimes[i].time <= now) {
        return this.stepTimes[i].step;
      }
    }
    return -1;
  }

  /** Énergie instantanée du mix, 0..1 — lue par le fond animé à chaque frame. */
  level(): number {
    const { analyser, levelBuf } = this;
    if (!analyser || !levelBuf || this.stopped) {
      return 0;
    }
    analyser.getFloatTimeDomainData(levelBuf);
    let sq = 0;
    for (const sample of levelBuf) {
      sq += sample * sample;
    }
    return Math.min(1, Math.sqrt(sq / levelBuf.length) / 0.3);
  }

  /**
   * Flash du kick, 0..1 : enveloppe exponentielle depuis le dernier kick
   * réellement JOUÉ (le séquenceur programme en avance — on ignore ceux
   * encore à venir). C'est ce signal, sample-accurate, qui fait battre le
   * fond : le RMS global du mix, lui, reste quasi plat entre les temps.
   */
  pulse(): number {
    if (this.stopped) {
      return 0;
    }
    const now = this.ctx.currentTime;
    let best = 0;
    for (const kt of this.kickTimes) {
      if (kt <= now) {
        best = Math.max(best, Math.exp(-(now - kt) * 7));
      }
    }
    return best;
  }

  stop(): void {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    this.stopClock();

    const ctx = this.ctx;
    const master = this.master;
    if (!master) {
      void ctx.close().catch(() => undefined);
      return;
    }
    const t = ctx.currentTime;
    const gain = master.gain;
    // Annulation + ancrage : sans cela, couper pendant le fade-in laisse la
    // rampe vers 0,07 programmée APRÈS la rampe vers 0 (remontée audible).
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(gain.value, t);
    gain.linearRampToValueAtTime(0, t + 0.8);
    // Les événements déjà programmés (≤ horizon) meurent sous le fondu.
    setTimeout(() => void ctx.close().catch(() => undefined), 900);
  }

  // ------------------------------------------------------------ Horloge

  private startClock(): void {
    try {
      this.workerUrl = URL.createObjectURL(
        new Blob([`setInterval(() => postMessage(0), ${TICK_MS});`], {
          type: 'application/javascript',
        }),
      );
      this.worker = new Worker(this.workerUrl);
      this.worker.onmessage = () => this.tick();
      // CSP ou échec de chargement : repli sur le timer de la fenêtre.
      this.worker.onerror = () => this.fallbackClock();
    } catch {
      this.fallbackClock();
    }
  }

  private fallbackClock(): void {
    this.stopClock();
    if (!this.stopped) {
      this.timer = setInterval(() => this.tick(), TICK_MS);
    }
  }

  private stopClock(): void {
    this.worker?.terminate();
    this.worker = undefined;
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = undefined;
    }
    clearInterval(this.timer);
    this.timer = undefined;
  }

  // ------------------------------------------------------------ Séquenceur

  private tick(): void {
    if (this.stopped) {
      return;
    }
    // Onglet caché avec le timer de repli (~1 Hz) : on programme plus loin.
    const ahead =
      this.timer && typeof document !== 'undefined' && document.visibilityState === 'hidden'
        ? 1.2
        : LOOKAHEAD;
    const now = this.ctx.currentTime;
    // Trou d'horloge (throttling agressif, gel de l'onglet) : on ne rattrape
    // pas les pas manqués — une rafale de dizaines de notes — on resynchronise.
    if (this.nextStepTime < now - 0.1) {
      this.nextStepTime = now + 0.05;
    }
    this.scheduleAhead(now + ahead);
  }

  /** Programme tous les pas jusqu'à l'horizon donné (temps audio absolu). */
  private scheduleAhead(until: number): void {
    while (this.nextStepTime < until) {
      this.scheduleStep(this.step, this.nextStepTime);
      // Le swing vit ici : la 1re double de chaque paire est longue.
      this.nextStepTime += (this.step % 2 === 0 ? SWING : 1 - SWING) * EIGHTH;
      this.step = (this.step + 1) % GRID;
      if (this.step === 0) {
        this.bar++;
      }
    }
  }

  /**
   * Rendu hors-ligne (commande `rec`) : construit le graphe et programme le
   * morceau entier d'un coup — pas d'horloge, l'OfflineAudioContext fera le
   * reste plus vite que le temps réel.
   */
  renderInto(duration: number): void {
    this.noise = this.makeNoise();
    this.buildGraph();
    this.nextStepTime = 0.05;
    this.scheduleAhead(duration);
  }

  private scheduleStep(step: number, t: number): void {
    this.stepTimes.push({ step, time: t });
    if (this.stepTimes.length > 64) {
      this.stepTimes.splice(0, 32);
    }

    if (step === 0 && this.bar % 8 === 7) {
      // Chaîne de Markov des sections, décidée UNE mesure à l'avance pour
      // que le fill de basse anticipe la vraie prochaine fondamentale :
      // A reste en A (0,7) ou part en pont B (0,3) ; B retourne toujours en A.
      this.nextSection = this.section === 'B' ? 'A' : Math.random() < P_BRIDGE ? 'B' : 'A';
    }
    if (step === 0 && this.bar % 2 === 0) {
      this.nextChord(t);
    }
    const chord = SECTIONS[this.section][this.chordIdx];

    if (step === 0) {
      // Marche aléatoire du filtre des nappes, une fois par mesure.
      this.cutoffBase = clamp(this.cutoffBase + (Math.random() - 0.5) * 80, 650, 1100);
      for (const f of this.padFilters) {
        f.frequency.setTargetAtTime(this.cutoffBase, t, 0.5);
      }
      // Lueur : placée librement dans la mesure, jamais deux à la fois.
      if (Math.random() < P.sparkle && t >= this.sparkleUntil) {
        const st = t + Math.random() * BAR;
        this.sparkleUntil = st + 2.5;
        this.sparkle(st);
      }
    }

    this.scheduleBass(chord, step, t);
    this.scheduleArp(chord, step, t);
    this.scheduleStabs(chord, step, t);
    this.scheduleDrums(step, t);
  }

  private nextChord(t: number): void {
    this.chordIdx = (this.chordIdx + 1) % 4;
    if (this.chordIdx === 0 && this.bar > 0) {
      const entersBridge = this.section === 'A' && this.nextSection === 'B';
      this.section = this.nextSection;
      if (entersBridge) {
        // Accent d'entrée du pont : sweep de bruit ou chute de sub.
        if (Math.random() < 0.5) {
          this.noiseSweep(t);
        } else {
          this.subDrop(t);
        }
      }
    }
    this.padChord(SECTIONS[this.section][this.chordIdx].pad, t);
  }

  /** Le prochain accord, changement de section compris. */
  private nextChordDef(): ChordDef {
    if (this.chordIdx === 3) {
      return SECTIONS[this.nextSection][0];
    }
    return SECTIONS[this.section][this.chordIdx + 1];
  }

  // ------------------------------------------------------------ Nappes

  private padChord(notes: number[], t: number): void {
    const ctx = this.ctx;

    // Relâche l'accord précédent : crossfade d'environ 4 s avec le nouveau,
    // ancré sur la valeur réelle (l'attaque peut être encore en cours).
    for (const voice of this.padVoices) {
      const g = voice.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + 3.5);
      for (const src of voice.sources) {
        src.stop(t + 3.6);
      }
    }
    this.padVoices = [];

    // Enveloppe commune du nouvel accord : A 1,8 s / D 1,2 s / S 0,8.
    const group = ctx.createGain();
    group.gain.setValueAtTime(0, t);
    group.gain.linearRampToValueAtTime(1, t + 1.8);
    group.gain.linearRampToValueAtTime(0.8, t + 3);
    group.connect(this.padFilterIn);

    const sources: OscillatorNode[] = [];
    for (const midi of notes) {
      const freq = midiToHz(midi);
      // Supersaw : quatre scies désaccordées en éventail stéréo,
      // plus un sinus à l'octave inférieure (chaleur sombre, pas de shimmer).
      for (const [type, ratio, detune, pan, level] of [
        ['sawtooth', 1, -9, -0.6, 0.055],
        ['sawtooth', 1, -3, -0.2, 0.055],
        ['sawtooth', 1, 3, 0.2, 0.055],
        ['sawtooth', 1, 9, 0.6, 0.055],
        ['sine', 0.5, 0, 0, 0.05],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq * ratio;
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = level;
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        osc.connect(g).connect(p).connect(group);
        osc.start(t);
        reap(osc, g, p);
        sources.push(osc);
      }
    }
    // Le gain de groupe est libéré avec le dernier oscillateur.
    sources[sources.length - 1].addEventListener('ended', () => group.disconnect());
    this.padVoices.push({ gain: group, sources });
  }

  // ------------------------------------------------------------ Basse

  private scheduleBass(chord: ChordDef, step: number, t: number): void {
    // Fill toutes les 4 mesures : quinte → septième → anticipation du
    // prochain accord (section suivante comprise), en doubles swinguées.
    if (this.bar % 4 === 3 && step >= 12) {
      const fills: Partial<Record<number, [number, number]>> = {
        12: [chord.bass + 7, 0.8],
        14: [chord.bass + chord.seventh, 0.7],
        15: [this.nextChordDef().bass, 0.9],
      };
      const fill = fills[step];
      if (fill) {
        this.bassNote(t, fill[0], fill[1], EIGHTH * 0.28);
      }
      return;
    }
    const ev = at(this.patterns.bass, step);
    if (!ev) {
      return;
    }
    const ghost = ev.vel < 0.5; // les ghosts sont plus courts
    this.bassNote(t, chord.bass + ev.offset, ev.vel, EIGHTH * (ghost ? 0.4 : 0.55));
  }

  private bassNote(t: number, midi: number, vel: number, dur: number): void {
    const ctx = this.ctx;
    // Un pattern live-codé farfelu ne doit jamais sortir du registre sain.
    const freq = midiToHz(clamp(midi, 14, 74));

    // Pluck : passe-bas avec enveloppe de fréquence (180 → 780 → 180 Hz).
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(180, t);
    filter.frequency.linearRampToValueAtTime(780, t + 0.005);
    filter.frequency.setTargetAtTime(180, t + 0.005, 0.06);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.004);
    g.gain.setTargetAtTime(vel * 0.3, t + 0.004, 0.05);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.03);

    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = freq;
    const sub = ctx.createOscillator();
    // Sinus une octave sous — sauf si elle tombe dans l'infrasonique
    // (F1/2 ≈ 21,8 Hz : inaudible, pur gaspillage de marge).
    const subFreq = freq / 2;
    sub.frequency.value = subFreq >= 35 ? subFreq : freq;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;

    saw.connect(filter);
    sub.connect(subGain).connect(filter);
    filter.connect(g).connect(this.bassGain);

    const end = t + dur + 0.3;
    saw.start(t);
    saw.stop(end);
    sub.start(t);
    sub.stop(end);
    reap(saw);
    reap(sub, subGain, filter, g);
  }

  // ------------------------------------------------------------ Arpège

  private scheduleArp(chord: ChordDef, step: number, t: number): void {
    // Le motif est FIXE (une vague écrite dans la partition) et se transpose
    // avec l'accord — la répétition fait la musique, le hasard n'humanise
    // qu'à la marge (une note sautée, une nuance).
    const ev = at(this.patterns.arp, step);
    if (!ev || Math.random() >= P.arpPlay) {
      return;
    }
    const notes = chord.pad; // registre médium (≈ 53–76)
    // Degré replié sur 0..7 : un pattern live-codé reste toujours dans l'accord.
    const span = notes.length * 2;
    const deg = ((Math.trunc(ev.offset) % span) + span) % span;
    const midi = deg < notes.length ? notes[deg] : notes[deg - notes.length] + 12;
    const vel = ev.vel * (0.55 + Math.random() * 0.15);
    const pan = step % 2 === 0 ? -0.3 : 0.3;
    this.arpNote(t, midi, vel, pan);
  }

  private arpNote(t: number, midi: number, vel: number, pan: number): void {
    const ctx = this.ctx;
    const freq = midiToHz(midi);

    // Pluck analogique sombre : deux scies désaccordées sous un passe-bas
    // résonant à enveloppe — le carré nu sonnait chiptune.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3.5;
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.linearRampToValueAtTime(1600 + vel * 900, t + 0.006);
    filter.frequency.setTargetAtTime(380, t + 0.006, 0.11);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.003);
    g.gain.setTargetAtTime(0.0001, t + 0.003, 0.09);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    filter.connect(g).connect(p).connect(this.arpIn);

    const pair: OscillatorNode[] = [];
    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + 0.5);
      pair.push(osc);
    }
    reap(pair[0]);
    reap(pair[1], filter, g, p);
  }

  // ------------------------------------------------------------ Stabs

  private scheduleStabs(chord: ChordDef, step: number, t: number): void {
    if (this.bar % 2 !== 0) {
      return; // seulement la mesure du changement d'accord
    }
    const ev = at(this.patterns.stab, step);
    if (!ev || Math.random() >= P.stab) {
      return;
    }
    this.stab(t, chord, ev.vel);
  }

  /** Stab de cuivres synthétiques : l'accord entier en scies désaccordées,
   *  « blat » de pitch à l'attaque, filtre qui claque puis se referme. */
  private stab(t: number, chord: ChordDef, vel: number): void {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.linearRampToValueAtTime(2600, t + 0.02);
    filter.frequency.setTargetAtTime(600, t + 0.02, 0.09);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.setTargetAtTime(0.0001, t + 0.09, 0.07);
    filter.connect(g).connect(this.stabGain);

    const sources: OscillatorNode[] = [];
    for (const midi of chord.pad) {
      for (const detune of [-8, 8]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = midiToHz(midi);
        // Le « blat » cuivré : la hauteur monte au vrai ton en ~35 ms.
        osc.detune.setValueAtTime(detune - 70, t);
        osc.detune.linearRampToValueAtTime(detune, t + 0.035);
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + 0.5);
        sources.push(osc);
      }
    }
    sources.forEach((osc, i) => (i === sources.length - 1 ? reap(osc, filter, g) : reap(osc)));
  }

  // ------------------------------------------------------------ Percussions

  private scheduleDrums(step: number, t: number): void {
    const kick = at(this.patterns.kick, step);
    if (kick && Math.random() < P.kick) {
      this.kick(t, kick.vel);
    }

    const clap = at(this.patterns.clap, step);
    if (clap && Math.random() < P.clap) {
      this.clap(t, clap.vel);
    }

    const open = step === 14 && Math.random() < P.openHat;
    if (open) {
      // Choke : les fermés/fantômes se taisent sous le « tsss » ouvert
      // (0,35 s couvre le fantôme du 1er pas de la mesure suivante).
      this.openHatUntil = t + 0.35;
      this.hat(t, 0.5, 0.35);
    }
    const hat = at(this.patterns.hats, step);
    if (hat && !open && t >= this.openHatUntil && Math.random() < P.hat) {
      this.hat(t, hat.vel, 0.09); // « tss » de contretemps, mi-ouvert
    }
    const ghost = at(this.patterns.ghost, step);
    if (ghost && t >= this.openHatUntil && Math.random() < P.hatGhost) {
      this.hat(t, ghost.vel, 0.03);
    }

    const perc = at(this.patterns.perc, step);
    if (perc && Math.random() < P.perc) {
      this.perc(t, perc.vel);
    }
  }

  /** Kick synthétique : sinus avec enveloppe de pitch 150 → 45 Hz, queue longue. */
  private kick(t: number, vel: number): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g).connect(this.kickGain);
    osc.start(t);
    osc.stop(t + 0.35);
    reap(osc, g);
    this.duck(t);

    this.kickTimes.push(t);
    if (this.kickTimes.length > 4) {
      this.kickTimes.shift();
    }
  }

  /** Sidechain simulé : le kick creuse nappes + arpège + reverb — la
   *  « pompe » french house, prononcée puisque le kick est sur chaque temps. */
  private duck(t: number): void {
    const g = this.duckGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(0.45, t + 0.008);
    g.setTargetAtTime(1, t + 0.03, 0.18);
  }

  /** Clap : trois micro-rafales de bruit puis la queue — l'imitation
   *  classique des mains multiples, dans un passe-bande médium. */
  private clap(t: number, vel: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    // Deux micro-rafales, puis la troisième enchaîne directement sur la
    // queue (le decay ne doit pas chevaucher sa montée).
    for (const [dt, v] of [
      [0, 0.7],
      [0.011, 0.5],
    ] as const) {
      g.gain.linearRampToValueAtTime(vel * v, t + dt + 0.002);
      g.gain.linearRampToValueAtTime(vel * v * 0.3, t + dt + 0.009);
    }
    g.gain.linearRampToValueAtTime(vel, t + 0.024);
    g.gain.setTargetAtTime(0.0001, t + 0.026, 0.06);
    src.connect(g).connect(this.clapIn);
    src.start(t, Math.random() * 1.5, 0.3);
    reap(src, g);
  }

  /** Hat : tranche du buffer de bruit partagé, lecture à hauteur variable. */
  private hat(t: number, vel: number, decay: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(g).connect(this.hatIn);
    src.start(t, Math.random() * 1.5, decay + 0.05);
    reap(src, g);
  }

  /** Perc métallique : bruit dans un passe-bande résonant. */
  private perc(t: number, vel: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(g).connect(this.percIn);
    src.start(t, Math.random() * 1.5, 0.12);
    reap(src, g);
  }

  // ------------------------------------------------------------ Éléments rares

  /** Lueur : paire de sinus désaccordés qui ENFLE lentement puis se perd
   *  dans le délai — une nappe fugitive, pas une clochette. */
  private sparkle(t: number): void {
    const ctx = this.ctx;
    const freq = midiToHz(SPARKLE_NOTES[(Math.random() * SPARKLE_NOTES.length) | 0]);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.6, t + 0.35);
    g.gain.setTargetAtTime(0.0001, t + 0.35, 0.5);
    const p = ctx.createStereoPanner();
    p.pan.value = (Math.random() * 2 - 1) * 0.8;
    g.connect(p).connect(this.sparkleGain);

    const pair: OscillatorNode[] = [];
    for (const detune of [-5, 5]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 2.5);
      pair.push(osc);
    }
    reap(pair[0]);
    reap(pair[1], g, p);
  }

  /** Sweep de bruit filtré, à l'entrée du pont. */
  private noiseSweep(t: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(200, t);
    bp.frequency.exponentialRampToValueAtTime(6000, t + 4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.02, t + 0.5);
    g.gain.linearRampToValueAtTime(0, t + 4);
    src.connect(bp).connect(g).connect(this.comp);
    src.start(t);
    src.stop(t + 4);
    reap(src, bp, g);
  }

  /** Chute de sub : sinus 55 → 27,5 Hz. */
  private subDrop(t: number): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.exponentialRampToValueAtTime(27.5, t + 2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.linearRampToValueAtTime(0, t + 2);
    osc.connect(g).connect(this.comp);
    osc.start(t);
    osc.stop(t + 2.1);
    reap(osc, g);
  }

  // ------------------------------------------------------------ Graphe fixe

  private buildGraph(): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Master avec fondu d'entrée (comportement historique conservé).
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.07, t + 2.5);
    master.connect(ctx.destination);
    this.master = master;

    // Compresseur de bus : glue et filet anti-clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.25;
    comp.connect(master);
    this.comp = comp;

    // Énergie du mix prélevée AVANT l'atténuation master (signal sain).
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    comp.connect(analyser);
    this.analyser = analyser;
    this.levelBuf = new Float32Array(analyser.fftSize);

    // Bus « duckable » : nappes + arpège + retour de reverb, creusé par le kick.
    const duck = ctx.createGain();
    duck.connect(comp);
    this.duckGain = duck;

    // Nappes : deux passe-bas en série (24 dB/oct) balayés par un LFO lent.
    const lp1 = ctx.createBiquadFilter();
    const lp2 = ctx.createBiquadFilter();
    for (const f of [lp1, lp2]) {
      f.type = 'lowpass';
      f.frequency.value = 800;
      f.Q.value = 0.7;
    }
    const padGain = ctx.createGain();
    padGain.gain.value = 0.42;
    lp1.connect(lp2).connect(padGain).connect(duck);
    this.padFilterIn = lp1;
    this.padFilters = [lp1, lp2];
    this.cutoffBase = 800;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 350;
    lfo.connect(lfoDepth);
    lfoDepth.connect(lp1.frequency);
    lfoDepth.connect(lp2.frequency);
    lfo.start();

    // Basse : sèche, au centre, sans effets.
    this.bassGain = ctx.createGain();
    this.bassGain.gain.value = 0.5;
    this.bassGain.connect(comp);

    // Arpège : bande utile 160 Hz – 2,2 kHz (le registre est descendu).
    const arpHP = ctx.createBiquadFilter();
    arpHP.type = 'highpass';
    arpHP.frequency.value = 160;
    const arpLP = ctx.createBiquadFilter();
    arpLP.type = 'lowpass';
    arpLP.frequency.value = 2200;
    const arpGain = ctx.createGain();
    arpGain.gain.value = 0.26;
    arpHP.connect(arpLP).connect(arpGain).connect(duck);
    this.arpIn = arpHP;

    // Percussions.
    this.kickGain = ctx.createGain();
    this.kickGain.gain.value = 0.6;
    this.kickGain.connect(comp);

    const hatHP = ctx.createBiquadFilter();
    hatHP.type = 'highpass';
    hatHP.frequency.value = 8000;
    const drumGain = ctx.createGain();
    drumGain.gain.value = 0.14; // présents mais derrière kick et basse
    hatHP.connect(drumGain);
    drumGain.connect(comp);
    this.hatIn = hatHP;

    const percBP = ctx.createBiquadFilter();
    percBP.type = 'bandpass';
    percBP.frequency.value = 1100;
    percBP.Q.value = 6;
    percBP.connect(drumGain);
    this.percIn = percBP;

    // Clap : bande médium large, plus fort que les hats, direct vers le bus.
    const clapBP = ctx.createBiquadFilter();
    clapBP.type = 'bandpass';
    clapBP.frequency.value = 1300;
    clapBP.Q.value = 0.9;
    const clapGain = ctx.createGain();
    clapGain.gain.value = 0.35;
    clapBP.connect(clapGain);
    clapGain.connect(comp);
    this.clapIn = clapBP;

    // Stabs de cuivres : bus direct (pas de duck — ils tombent AVEC le kick).
    this.stabGain = ctx.createGain();
    this.stabGain.gain.value = 0.12;
    this.stabGain.connect(comp);

    // Sparkles.
    this.sparkleGain = ctx.createGain();
    this.sparkleGain.gain.value = 0.12;
    this.sparkleGain.connect(comp);

    // Réverbération : convolution sur une IR générée (bruit décroissant
    // décorrélé, T60 2,8 s) — toujours zéro sample.
    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeImpulse();
    const revIn = ctx.createGain();
    const revReturn = ctx.createGain();
    revReturn.gain.value = 0.3;
    revIn.connect(convolver).connect(revReturn).connect(duck);

    // Délai ping-pong à la croche pointée, filtré dans la boucle.
    const delayL = ctx.createDelay(1);
    const delayR = ctx.createDelay(1);
    delayL.delayTime.value = EIGHTH * 1.5;
    delayR.delayTime.value = EIGHTH * 1.5;
    const loopHP = ctx.createBiquadFilter();
    loopHP.type = 'highpass';
    loopHP.frequency.value = 400;
    const loopLP = ctx.createBiquadFilter();
    loopLP.type = 'lowpass';
    loopLP.frequency.value = 3500;
    const fbLR = ctx.createGain();
    const fbRL = ctx.createGain();
    fbLR.gain.value = 0.6; // ≈ 0,36 par tour complet
    fbRL.gain.value = 0.6;
    const panL = ctx.createStereoPanner();
    panL.pan.value = -1;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 1;
    const delayIn = ctx.createGain();
    const delayReturn = ctx.createGain();
    delayReturn.gain.value = 0.25;
    delayReturn.connect(comp);
    delayIn.connect(delayL);
    delayL.connect(panL).connect(delayReturn);
    delayL.connect(loopHP).connect(loopLP).connect(fbLR).connect(delayR);
    delayR.connect(panR).connect(delayReturn);
    delayR.connect(fbRL).connect(delayL);

    // Départs d'effets.
    send(padGain, revIn, 0.35);
    send(arpGain, revIn, 0.25);
    send(arpGain, delayIn, 0.25);
    send(drumGain, revIn, 0.15);
    send(clapGain, revIn, 0.2);
    send(this.stabGain, revIn, 0.3);
    send(this.stabGain, delayIn, 0.3);
    send(this.sparkleGain, revIn, 0.5);
    send(this.sparkleGain, delayIn, 0.4);
  }

  /** Buffer de bruit blanc de 2 s, partagé par hats, percs et sweeps. */
  private makeNoise(): AudioBuffer {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  /** Réponse impulsionnelle : bruit décroissant, canaux décorrélés, pic à 0,5. */
  private makeImpulse(): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const len = Math.ceil(sr * 3.2);
    const pre = Math.floor(sr * 0.02); // pré-délai de 20 ms
    const buf = this.ctx.createBuffer(2, len, sr);
    let peak = 0;
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let lp = 0;
      for (let n = pre; n < len; n++) {
        lp = 0.78 * lp + 0.22 * (Math.random() * 2 - 1); // queue assombrie
        const v = lp * Math.exp((-6.91 * (n - pre)) / (sr * 2.8)); // -60 dB à T60
        data[n] = v;
        peak = Math.max(peak, Math.abs(v));
      }
    }
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let n = 0; n < len; n++) {
        data[n] *= 0.5 / peak;
      }
    }
    return buf;
  }
}

/** Déconnecte la chaîne d'une source à sa mort — aucune fuite, GC trivial. */
function reap(source: AudioScheduledSourceNode, ...nodes: AudioNode[]): void {
  source.onended = () => {
    source.disconnect();
    for (const n of nodes) {
      n.disconnect();
    }
  };
}

/** Encode un AudioBuffer en WAV 16 bits — pour la commande `rec`. */
export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const bytes = 44 + length * channels * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, length * channels * 2, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}

/** Départ d'effet à niveau fixe. */
function send(from: AudioNode, to: AudioNode, level: number): GainNode {
  const g = from.context.createGain();
  g.gain.value = level;
  from.connect(g);
  g.connect(to);
  return g;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
