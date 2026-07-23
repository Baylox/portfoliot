import { Injectable, signal } from '@angular/core';
import type { AmbientEngine } from './ambient/ambient-engine';
import type { StepEvent } from './ambient/notation';
import { LivePattern, Station } from './ambient/live-patterns';

/**
 * Façade de l'ambiance sonore générative — synthwave en Web Audio API,
 * aucun fichier audio, aucune œuvre protégée : tout est synthétisé à
 * l'exécution (oscillateurs, bruit et réverbération générés).
 *
 * Le moteur (séquenceur, synthèse, effets) vit dans `./ambient/` et n'est
 * chargé qu'au premier toggle via un import dynamique : le bundle initial
 * ne paie que cette façade.
 *
 * L'AudioContext est créé de façon SYNCHRONE dans le geste utilisateur
 * (politique d'autoplay des navigateurs), puis confié au moteur une fois
 * le chunk chargé.
 */
@Injectable({ providedIn: 'root' })
export class AmbientAudioService {
  readonly playing = signal(false);
  /** Station en cours d'écoute (commande `radio`). */
  readonly station = signal<Station>('circuit');

  private engine?: AmbientEngine;
  private enginePromise?: Promise<typeof import('./ambient/ambient-engine')>;
  /** Invalide les démarrages devenus obsolètes (toggle pendant le chargement). */
  private generation = 0;

  toggle(): void {
    if (this.playing()) {
      this.stop();
    } else {
      this.start();
    }
  }

  /** Précharge le chunk du moteur (au survol, par ex.) — clic instantané. */
  preload(): void {
    this.enginePromise ??= import('./ambient/ambient-engine');
  }

  /** Énergie du mix (0..1) pour les visuels — 0 quand le synthé est coupé. */
  level(): number {
    return this.engine?.level() ?? 0;
  }

  /** Flash du kick (0..1), enveloppe déclenchée à l'instant exact du beat. */
  pulse(): number {
    return this.engine?.pulse() ?? 0;
  }

  /**
   * Live-coding : remplace un pattern du séquenceur en direct. Renvoie false
   * si le moteur n'est pas encore prêt ; propage l'erreur de la mini-notation
   * si le pattern est invalide.
   */
  setPattern(name: LivePattern, spec: string): boolean {
    if (!this.engine) {
      return false;
    }
    this.engine.setPattern(name, spec);
    return true;
  }

  /** Restaure la partition d'origine. */
  resetPatterns(): boolean {
    if (!this.engine) {
      return false;
    }
    this.engine.resetPatterns();
    this.station.set('circuit');
    return true;
  }

  /** Zappe sur une station (partition alternative appliquée d'un bloc). */
  setStation(name: Station): boolean {
    if (!this.engine) {
      return false;
    }
    this.engine.tuneTo(name);
    this.station.set(name);
    return true;
  }

  /** Les patterns joués (null si le moteur n'est pas prêt) — pour les pads. */
  patterns(): Record<LivePattern, StepEvent[]> | null {
    return this.engine?.getPatterns() ?? null;
  }

  /** Active/désactive un pas depuis la grille cliquable. */
  toggleStep(name: LivePattern, step: number): boolean {
    if (!this.engine) {
      return false;
    }
    this.engine.toggleStep(name, step);
    return true;
  }

  /** Pas actuellement audible (tête de lecture des pads), -1 sinon. */
  currentStep(): number {
    return this.engine?.currentStep() ?? -1;
  }

  /**
   * Rend la partition en cours en WAV, hors-ligne et plus vite que le temps
   * réel — la preuve téléchargeable du « zéro sample ».
   */
  async rec(duration = 30): Promise<Blob | null> {
    if (!this.engine || !this.enginePromise || typeof OfflineAudioContext === 'undefined') {
      return null;
    }
    const mod = await this.enginePromise;
    const sampleRate = 44100;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
    const renderer = new mod.AmbientEngine(offline as unknown as AudioContext);
    renderer.adoptPatterns(this.engine.getPatterns());
    renderer.renderInto(duration);
    return mod.encodeWav(await offline.startRendering());
  }

  private start(): void {
    if (typeof AudioContext === 'undefined') {
      return;
    }

    // Créé dans le clic : un contexte créé après un await peut naître
    // « suspended » sur Safari/iOS. Le constructeur peut jeter si le
    // navigateur plafonne le nombre de contextes (spam de toggle).
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }

    // Optimiste : le terminal lit `playing()` juste après `toggle()`.
    this.playing.set(true);
    const generation = ++this.generation;

    this.enginePromise ??= import('./ambient/ambient-engine');
    this.enginePromise
      .then((mod) => {
        if (generation !== this.generation) {
          // L'utilisateur a coupé (ou relancé) pendant le chargement.
          void ctx.close().catch(() => undefined);
          return;
        }
        this.engine = new mod.AmbientEngine(ctx);
        this.engine.start();
      })
      .catch(() => {
        // Chunk introuvable (hors-ligne, déploiement…) ou moteur qui jette
        // au démarrage : retour à l'état réel, sans horloge orpheline.
        this.enginePromise = undefined;
        this.engine?.stop();
        this.engine = undefined;
        void ctx.close().catch(() => undefined);
        if (generation === this.generation) {
          this.playing.set(false);
        }
      });
  }

  private stop(): void {
    this.generation++;
    this.playing.set(false);
    this.engine?.stop();
    this.engine = undefined;
  }
}
