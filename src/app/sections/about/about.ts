import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { RevealDirective } from '../../core/reveal.directive';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {
  protected readonly i18n = inject(LanguageService);
  protected readonly t = computed(() => this.i18n.ui().about);
  protected readonly paragraphs = computed(() => this.i18n.ui().profile.about);
}
