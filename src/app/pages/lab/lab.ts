import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { RevealDirective } from '../../core/reveal.directive';
import { highlight } from './highlight';
import { LAB_EN, LAB_FR } from './lab-content';

/** La page atelier : les coulisses techniques du site, étude par étude. */
@Component({
  selector: 'app-lab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './lab.html',
  styleUrl: './lab.scss',
})
export class Lab {
  protected readonly i18n = inject(LanguageService);
  protected readonly t = computed(() => (this.i18n.lang() === 'fr' ? LAB_FR : LAB_EN));

  /** Colore un extrait — contenu statique et de confiance (lab-content.ts). */
  protected colorize(code: string): string {
    return highlight(code);
  }
}
