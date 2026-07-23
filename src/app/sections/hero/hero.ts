import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Icon } from '../../core/icon';
import { LanguageService } from '../../core/i18n/language.service';
import { PROFILE, SOCIAL_LINKS } from '../../data/profile.data';
import { Terminal } from './terminal';

@Component({
  selector: 'app-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Terminal],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly i18n = inject(LanguageService);
  protected readonly profile = PROFILE;
  protected readonly socialLinks = SOCIAL_LINKS;
  protected readonly t = computed(() => this.i18n.ui().hero);
}
