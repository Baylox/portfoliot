import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PROFILE } from '../../data/profile.data';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  protected readonly i18n = inject(LanguageService);
  protected readonly t = computed(() => this.i18n.ui().footer);
  protected readonly profile = PROFILE;
  protected readonly year = new Date().getFullYear();
}
