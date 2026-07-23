import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AmbientAudioService } from '../../core/ambient-audio.service';
import { LanguageService } from '../../core/i18n/language.service';
import { PadsService } from '../../core/pads.service';
import { LIVE_PATTERNS, LivePattern, STATIONS, Station } from '../../core/ambient/live-patterns';

/**
 * Le séquenceur graphique : la même partition que la commande `score`,
 * mais en cases cliquables — une drum machine dans le portfolio. La tête
 * de lecture suit l'horloge audio du moteur, pas un minuteur approximatif.
 */
@Component({
  selector: 'app-pads',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pads.html',
  styleUrl: './pads.scss',
  host: { '(document:keydown.escape)': 'pads.close()' },
})
export class Pads {
  protected readonly pads = inject(PadsService);
  protected readonly audio = inject(AmbientAudioService);
  protected readonly i18n = inject(LanguageService);
  protected readonly t = computed(() => this.i18n.ui().pads);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly instruments = LIVE_PATTERNS;
  protected readonly stations = STATIONS;
  protected readonly steps = Array.from({ length: 16 }, (_, i) => i);
  protected readonly playhead = signal(-1);
  /** Incrémenté à chaque tick / clic pour recalculer la grille. */
  private readonly version = signal(0);

  /** Par instrument : vélocité du pas, ou null si silencieux. */
  protected readonly grid = computed(() => {
    this.version();
    const patterns = this.audio.patterns();
    if (!patterns) {
      return null;
    }
    const rows = {} as Record<LivePattern, (number | null)[]>;
    for (const inst of LIVE_PATTERNS) {
      const row = Array<number | null>(16).fill(null);
      for (const ev of patterns[inst]) {
        if (Number.isInteger(ev.step) && ev.step >= 0 && ev.step < 16) {
          row[ev.step] = ev.vel;
        }
      }
      rows[inst] = row;
    }
    return rows;
  });

  constructor() {
    // Rafraîchit tête de lecture et grille tant que le panneau est ouvert
    // (la partition peut aussi changer via la commande `score`).
    const timer = setInterval(() => {
      if (!this.pads.open()) {
        return;
      }
      this.playhead.set(this.audio.currentStep());
      this.version.update((v) => v + 1);
    }, 60);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected toggle(inst: LivePattern, step: number): void {
    if (this.audio.toggleStep(inst, step)) {
      this.version.update((v) => v + 1);
    }
  }

  protected tune(station: Station): void {
    if (this.audio.setStation(station)) {
      this.version.update((v) => v + 1);
    }
  }

  protected start(): void {
    if (!this.audio.playing()) {
      this.audio.toggle();
    }
  }
}
