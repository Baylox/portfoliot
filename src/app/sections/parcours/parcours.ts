import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { RevealDirective } from '../../core/reveal.directive';
import { PARCOURS } from '../../data/parcours.data';

@Component({
  selector: 'app-parcours',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './parcours.html',
  styleUrl: './parcours.scss',
})
export class Parcours {
  protected readonly i18n = inject(LanguageService);
  protected readonly t = computed(() => this.i18n.ui().parcours);

  /** Étapes de data/ (type, ordre), textes localisés via le dictionnaire. */
  protected readonly steps = computed(() =>
    PARCOURS.map((step, i) => ({
      type: step.type,
      ...(this.t().steps[i] ?? step),
    })),
  );
}
