import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AmbientAudioService } from '../../core/ambient-audio.service';
import { LIVE_PATTERNS, LivePattern, STATIONS, Station } from '../../core/ambient/live-patterns';
import { LanguageService } from '../../core/i18n/language.service';
import { TermHelp } from '../../core/i18n/terminal';
import { PadsService } from '../../core/pads.service';
import { ThemeService } from '../../core/theme.service';
import { GridFxService } from '../../core/grid-fx.service';
import { PROFILE } from '../../data/profile.data';
import { FEATURED_PROJECTS, PROJECTS } from '../../data/projects.data';
import { SKILL_GROUPS } from '../../data/skills.data';

type LineKind = 'cmd' | 'text' | 'muted' | 'accent' | 'error' | 'ascii' | 'link' | 'help' | 'vu';

interface TerminalLine {
  kind: LineKind;
  text: string;
  url?: string;
  label?: string;
}

/** Chaque commande a son aide dans le dictionnaire — parité vérifiée à la compilation. */
type CommandName = keyof TermHelp;

const PROMPT_USER = 'joris@baylox';

const NEOFETCH_ASCII = String.raw`
     ██╗██████╗
     ██║██╔══██╗
     ██║██║  ██║
██   ██║██║  ██║
╚█████╔╝██████╔╝
 ╚════╝ ╚═════╝`;

/** stack.txt et contact.txt sont neutres ; about.txt et architecture.md sont
 *  résolus au moment du `cat`, dans la langue courante. */
const FILES: Record<string, readonly string[]> = {
  'architecture.md': [],
  'about.txt': [],
  'stack.txt': ['Symfony · Spring Boot · NestJS · Angular · PostgreSQL · Docker'],
  'contact.txt': [`email : ${PROFILE.email}`, `github : ${PROFILE.githubUrl}`],
};

/**
 * Un vrai shell : saisie clavier, historique (↑/↓), autocomplétion (Tab)
 * et une douzaine de commandes qui racontent le profil. Les messages sont
 * lus dans le dictionnaire au moment de l'exécution — les lignes déjà
 * affichées restent dans leur langue, comme dans un vrai terminal.
 */
@Component({
  selector: 'app-terminal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terminal.html',
  styleUrl: './terminal.scss',
})
export class Terminal {
  protected readonly lines = signal<TerminalLine[]>([]);
  protected readonly booted = signal(false);
  /** Vrai pendant le faux crash de rm -rf / — le terminal tremble en rouge. */
  protected readonly crashed = signal(false);
  protected readonly promptUser = PROMPT_USER;

  private vuTimer?: ReturnType<typeof setInterval>;

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('cmdInput');
  private readonly outputRef = viewChild.required<ElementRef<HTMLElement>>('output');

  private readonly theme = inject(ThemeService);
  private readonly fx = inject(GridFxService);
  private readonly audio = inject(AmbientAudioService);
  private readonly padsPanel = inject(PadsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(LanguageService);

  private history: string[] = [];
  private historyIndex = -1;

  private readonly commands: Record<CommandName, (args: string[]) => void> = {
    help: () => this.cmdHelp(),
    whoami: () => this.cmdWhoami(),
    ls: () => this.cmdLs(),
    cat: (args) => this.cmdCat(args),
    skills: () => this.cmdSkills(),
    projects: (args) => this.cmdProjects(args),
    contact: () => this.cmdContact(),
    github: () => this.cmdGithub(),
    neofetch: () => this.cmdNeofetch(),
    neon: () => this.cmdNeon(),
    synth: () => this.cmdSynth(),
    vu: () => this.cmdVu(),
    score: (args) => this.cmdScore(args),
    pads: () => this.cmdPads(),
    radio: (args) => this.cmdRadio(args),
    rec: (args) => void this.cmdRec(args),
    overdrive: () => this.cmdOverdrive(),
    history: () => this.cmdHistory(),
    clear: () => this.lines.set([]),
    rm: (args) => this.cmdRm(args),
    sudo: (args) => this.cmdSudo(args),
    lang: (args) => this.cmdLang(args),
  };

  constructor() {
    // Fait défiler la sortie à chaque nouvelle ligne.
    effect(() => {
      this.lines();
      const el = this.outputRef().nativeElement;
      requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
    });

    afterNextRender(() => this.boot());
  }

  protected focusInput(): void {
    // Qui touche au terminal finira par taper `synth` : on précharge le moteur.
    this.audio.preload();
    if (this.booted() && !window.getSelection()?.toString()) {
      this.inputRef().nativeElement.focus();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Enter') {
      const raw = input.value;
      input.value = '';
      this.execute(raw);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.history.length > 0) {
        this.historyIndex = Math.max(0, this.historyIndex - 1);
        input.value = this.history[this.historyIndex] ?? '';
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.historyIndex = Math.min(this.history.length, this.historyIndex + 1);
      input.value = this.history[this.historyIndex] ?? '';
    } else if (event.key === 'Tab') {
      event.preventDefault();
      this.autocomplete(input);
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      this.lines.set([]);
    }
  }

  private boot(recovered = false): void {
    const t = this.i18n.term();
    const bootLines: TerminalLine[] = [
      ...(recovered ? [{ kind: 'error' as const, text: t.boot.recovered }] : []),
      { kind: 'accent', text: 'BAYLOX OS v5.0 — baylox-sh' },
      { kind: 'muted', text: t.boot.welcome },
      { kind: 'muted', text: t.boot.hint },
    ];
    bootLines.forEach((line, i) => {
      const timer = setTimeout(
        () => {
          this.push(line);
          if (i === bootLines.length - 1) {
            this.booted.set(true);
          }
        },
        350 + i * 420,
      );
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }

  private execute(raw: string): void {
    const trimmed = raw.trim();
    this.push({ kind: 'cmd', text: raw });

    if (!trimmed) {
      return;
    }

    this.history.push(trimmed);
    this.historyIndex = this.history.length;

    const [name, ...args] = trimmed.split(/\s+/);
    const lower = name.toLowerCase();
    if (this.isCommand(lower)) {
      this.commands[lower](args);
    } else {
      const t = this.i18n.term();
      this.push({ kind: 'error', text: t.notFound(name) }, { kind: 'muted', text: t.tryHelp });
    }
  }

  private isCommand(name: string): name is CommandName {
    return Object.hasOwn(this.commands, name);
  }

  private autocomplete(input: HTMLInputElement): void {
    const value = input.value;
    const parts = value.split(/\s+/);

    // Complète le nom de fichier après `cat `.
    if (parts.length === 2 && parts[0] === 'cat') {
      const match = Object.keys(FILES).find((f) => f.startsWith(parts[1]));
      if (match) {
        input.value = `cat ${match}`;
      }
      return;
    }

    // Complète l'instrument après `score `.
    if (parts.length === 2 && parts[0] === 'score') {
      const match = LIVE_PATTERNS.find((p) => p.startsWith(parts[1]));
      if (match) {
        input.value = `score ${match} `;
      }
      return;
    }

    // Complète la station après `radio `.
    if (parts.length === 2 && parts[0] === 'radio') {
      const match = STATIONS.find((s) => s.startsWith(parts[1]));
      if (match) {
        input.value = `radio ${match}`;
      }
      return;
    }

    const matches = Object.keys(this.commands).filter((c) => c.startsWith(value));
    if (matches.length === 1) {
      input.value = matches[0] + ' ';
    } else if (matches.length > 1 && value) {
      this.push({ kind: 'cmd', text: value }, { kind: 'muted', text: matches.join('   ') });
    }
  }

  private push(...lines: TerminalLine[]): void {
    this.lines.update((current) => [...current, ...lines]);
  }

  /* --- Commandes ------------------------------------------------------------ */

  private cmdHelp(): void {
    const t = this.i18n.term();
    this.push({ kind: 'accent', text: t.helpHeader });
    for (const name of Object.keys(this.commands) as CommandName[]) {
      this.push({ kind: 'help', label: name, text: t.helpOf[name] });
    }
    this.push({ kind: 'muted', text: t.helpFooter });
  }

  private cmdWhoami(): void {
    const ui = this.i18n.ui();
    this.push(
      { kind: 'text', text: `${PROFILE.name} — ${ui.profile.role}` },
      { kind: 'muted', text: ui.profile.headline },
    );
  }

  private cmdLs(): void {
    this.push(
      { kind: 'accent', text: 'projects/' },
      ...Object.keys(FILES).map((f) => ({ kind: 'text' as const, text: f })),
    );
  }

  private cmdCat(args: string[]): void {
    const t = this.i18n.term();
    const file = args[0];
    if (!file) {
      this.push({ kind: 'error', text: t.catMissing });
      return;
    }
    if (file === 'architecture.md') {
      // Le portfolio documente sa propre architecture dans son propre shell.
      this.push(
        { kind: 'ascii', text: t.architectureAscii },
        { kind: 'muted', text: t.files.architectureNote },
      );
      return;
    }
    if (file === 'about.txt') {
      this.push(...t.files.aboutTxt.map((text) => ({ kind: 'text' as const, text })));
      return;
    }
    const content = FILES[file];
    if (!content) {
      this.push({ kind: 'error', text: t.catNotFound(file) });
      return;
    }
    this.push(...content.map((text) => ({ kind: 'text' as const, text })));
  }

  private cmdSkills(): void {
    const groups = this.i18n.ui().skills.groups;
    for (const group of SKILL_GROUPS) {
      this.push(
        { kind: 'accent', text: `▸ ${groups[group.title] ?? group.title}` },
        { kind: 'text', text: `  ${group.skills.join(' · ')}` },
      );
    }
  }

  private cmdProjects(args: string[]): void {
    const ui = this.i18n.ui().projects;
    const list = args.includes('--all') ? PROJECTS : FEATURED_PROJECTS;
    for (const project of list) {
      const kind = ui.byName[project.name]?.kind ?? project.kind;
      const tags = project.tags.map((tag) => ui.tags[tag] ?? tag);
      this.push(
        { kind: 'link', text: `▸ ${project.name} — ${kind}`, url: project.githubUrl },
        { kind: 'muted', text: `  ${tags.join(' · ')}` },
      );
    }
    if (!args.includes('--all')) {
      this.push({ kind: 'muted', text: this.i18n.term().projectsHint });
    }
  }

  private cmdContact(): void {
    this.push(
      { kind: 'link', text: `email  : ${PROFILE.email}`, url: `mailto:${PROFILE.email}` },
      { kind: 'link', text: `github : ${PROFILE.githubUrl}`, url: PROFILE.githubUrl },
    );
  }

  private cmdGithub(): void {
    this.push({ kind: 'muted', text: this.i18n.term().githubOpening(PROFILE.githubUrl) });
    window.open(PROFILE.githubUrl, '_blank', 'noopener');
  }

  private cmdNeofetch(): void {
    const t = this.i18n.term().neofetch;
    this.push(
      { kind: 'ascii', text: NEOFETCH_ASCII },
      { kind: 'text', text: `${PROMPT_USER}` },
      { kind: 'muted', text: '─'.repeat(24) },
      { kind: 'text', text: t.os },
      { kind: 'text', text: t.shell },
      { kind: 'text', text: t.stack },
      { kind: 'text', text: t.front(majorAngularVersion()) },
      { kind: 'text', text: t.neon(this.theme.accent()) },
      { kind: 'text', text: t.uptime },
    );
  }

  private cmdNeon(): void {
    this.theme.toggle();
    const t = this.i18n.term();
    this.push({
      kind: 'accent',
      text: this.theme.accent() === 'cyan' ? t.neonCyan : t.neonOrange,
    });
  }

  private cmdSynth(): void {
    this.audio.toggle();
    const t = this.i18n.term();
    this.push(
      this.audio.playing()
        ? { kind: 'accent', text: t.synthOn }
        : { kind: 'muted', text: t.synthOff },
    );
    if (this.audio.playing()) {
      this.push({ kind: 'muted', text: t.synthOnHint });
    }
  }

  /** Live-coding façon Strudel : remplace un pattern du séquenceur en direct. */
  private cmdScore(args: string[]): void {
    const t = this.i18n.term();
    if (!this.audio.playing()) {
      this.push({ kind: 'muted', text: t.synthIsOff });
      return;
    }
    const [inst, ...rest] = args;

    if (inst === 'reset') {
      if (this.audio.resetPatterns()) {
        this.push({ kind: 'accent', text: t.scoreReset });
      } else {
        this.push({ kind: 'muted', text: t.engineBooting });
      }
      return;
    }

    if (!inst || rest.length === 0) {
      const [usageHeader, usageExample] = t.scoreUsage;
      this.push(
        { kind: 'accent', text: usageHeader },
        { kind: 'text', text: usageExample },
        { kind: 'text', text: t.scoreInstruments(LIVE_PATTERNS.join(' · ')) },
        { kind: 'muted', text: t.scoreLegend },
        { kind: 'muted', text: t.scoreResetHint },
      );
      return;
    }

    if (!(LIVE_PATTERNS as readonly string[]).includes(inst)) {
      this.push({ kind: 'error', text: t.scoreUnknown(inst) });
      return;
    }

    const spec = rest.join(' ');
    try {
      if (!this.audio.setPattern(inst as LivePattern, spec)) {
        this.push({ kind: 'muted', text: t.engineBooting });
        return;
      }
      this.push({ kind: 'accent', text: `${inst} ← ${spec}` });
    } catch (error) {
      this.push({
        kind: 'error',
        text: t.scoreError(error instanceof Error ? error.message : t.scoreInvalidPattern),
      });
    }
  }

  /** Zappe entre les partitions écrites pour le séquenceur. */
  private cmdRadio(args: string[]): void {
    const t = this.i18n.term();
    if (!this.audio.playing()) {
      this.push({ kind: 'muted', text: t.synthIsOff });
      return;
    }
    const [nom] = args;
    if (!nom) {
      this.push({ kind: 'accent', text: t.radioHeader });
      for (const s of STATIONS) {
        this.push({ kind: 'text', text: `  ${s === this.audio.station() ? '▸' : ' '} ${s}` });
      }
      this.push({ kind: 'muted', text: t.radioFooter });
      return;
    }
    if (!(STATIONS as readonly string[]).includes(nom)) {
      this.push({ kind: 'error', text: t.radioUnknown(nom) });
      return;
    }
    if (!this.audio.setStation(nom as Station)) {
      this.push({ kind: 'muted', text: t.engineBooting });
      return;
    }
    this.push({ kind: 'accent', text: t.radioTuned(nom) });
  }

  /** Rend le beat en cours en .wav, hors-ligne, et le télécharge. */
  private async cmdRec(args: string[]): Promise<void> {
    const t = this.i18n.term();
    if (!this.audio.playing()) {
      this.push({ kind: 'muted', text: t.synthIsOff });
      return;
    }
    const duration = Math.max(5, Math.min(60, Number.parseInt(args[0] ?? '', 10) || 30));
    this.push({ kind: 'muted', text: t.recRendering(duration) });
    const blob = await this.audio.rec(duration);
    if (!blob) {
      this.push({ kind: 'error', text: t.recUnsupported });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baylox-jam.wav';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    this.push({ kind: 'accent', text: t.recDone(duration) });
  }

  /** Ouvre/ferme le séquenceur graphique — la même partition, en cases cliquables. */
  private cmdPads(): void {
    this.padsPanel.toggle();
    const t = this.i18n.term();
    this.push(
      this.padsPanel.open()
        ? { kind: 'accent', text: t.padsOpened }
        : { kind: 'muted', text: t.padsClosed },
    );
  }

  /** Vu-mètre ASCII branché sur le moteur audio (niveau lissé + kick). */
  private cmdVu(): void {
    if (this.vuTimer) {
      this.stopVu(this.i18n.term().vuOff);
      return;
    }
    if (!this.audio.playing()) {
      this.push({ kind: 'muted', text: this.i18n.term().synthIsOff });
      return;
    }
    this.push({ kind: 'vu', text: vuLine(0, 0) });
    this.vuTimer = setInterval(() => {
      if (!this.audio.playing()) {
        this.stopVu(this.i18n.term().vuOffSynth);
        return;
      }
      const text = vuLine(this.audio.level(), this.audio.pulse());
      let found = false;
      this.lines.update((current) => {
        const copy = [...current];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].kind === 'vu') {
            copy[i] = { ...copy[i], text };
            found = true;
            break;
          }
        }
        return copy;
      });
      if (!found) {
        this.stopVu(); // la ligne a disparu (clear) : on s'arrête sans bruit
      }
    }, 90);
    this.destroyRef.onDestroy(() => clearInterval(this.vuTimer));
  }

  private stopVu(message?: string): void {
    clearInterval(this.vuTimer);
    this.vuTimer = undefined;
    if (message) {
      this.push({ kind: 'muted', text: message });
    }
  }

  /** Le grand classique — faux crash, vraie récupération. */
  private cmdRm(args: string[]): void {
    const t = this.i18n.term();
    if (!args.includes('-rf') && !args.includes('-fr')) {
      this.push({ kind: 'error', text: t.rmTimid });
      return;
    }
    this.booted.set(false); // coupe la saisie le temps du crash
    this.stopVu();
    const doomed = ['/bin', '/usr', '/etc', '/var', '/home/joris', '/boot'];
    doomed.forEach((path, i) => {
      const timer = setTimeout(
        () => this.push({ kind: 'error', text: t.rmRemoving(path) }),
        i * 150,
      );
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });
    const crash = setTimeout(() => this.crashed.set(true), 950);
    const reboot = setTimeout(() => {
      this.crashed.set(false);
      this.lines.set([]);
      this.boot(true);
    }, 2500);
    this.destroyRef.onDestroy(() => {
      clearTimeout(crash);
      clearTimeout(reboot);
    });
  }

  private cmdOverdrive(): void {
    this.fx.requestBurst();
    const t = this.i18n.term();
    this.push({ kind: 'accent', text: t.overdrive }, { kind: 'muted', text: t.overdriveEnd });
  }

  private cmdHistory(): void {
    if (this.history.length === 0) {
      this.push({ kind: 'muted', text: this.i18n.term().historyEmpty });
      return;
    }
    this.push(
      ...this.history.map((cmd, i) => ({
        kind: 'text' as const,
        text: `  ${String(i + 1).padStart(3)}  ${cmd}`,
      })),
    );
  }

  private cmdSudo(args: string[]): void {
    const t = this.i18n.term();
    if (args.join(' ') === 'hire-me') {
      this.push(
        { kind: 'accent', text: t.sudoGranted },
        { kind: 'link', text: `→ ${PROFILE.email}`, url: `mailto:${PROFILE.email}` },
      );
      return;
    }
    this.push({ kind: 'error', text: t.sudoDenied(PROMPT_USER) });
  }

  /** Bascule FR ⇄ EN — la même bascule que le bouton du header. */
  private cmdLang(args: string[]): void {
    const [target] = args;
    if (!target) {
      const lang = this.i18n.lang();
      this.push({
        kind: 'text',
        text: this.i18n.term().langCurrent(lang, lang === 'fr' ? 'en' : 'fr'),
      });
      return;
    }
    const lower = target.toLowerCase();
    if (lower !== 'fr' && lower !== 'en') {
      this.push({ kind: 'error', text: this.i18n.term().langUnknown(target) });
      return;
    }
    this.i18n.set(lower);
    // Confirmation dans la nouvelle langue — le dictionnaire vient de changer.
    this.push({ kind: 'accent', text: this.i18n.term().langSwitched(lower) });
  }
}

function majorAngularVersion(): string {
  // La version exacte importe peu ici — affichage cosmétique.
  return '21';
}

/** Barres du vu-mètre : niveau du mix + témoin du kick. */
function vuLine(level: number, pulse: number): string {
  const filled = Math.round(Math.min(1, level) * 18);
  const bar = '█'.repeat(filled).padEnd(18, '░');
  return `vu [${bar}] kick ${pulse > 0.3 ? '●' : '○'}`;
}
