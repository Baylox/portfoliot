import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Icon } from '../../core/icon';
import { LanguageService } from '../../core/i18n/language.service';
import { RevealDirective } from '../../core/reveal.directive';
import { PROFILE, SOCIAL_LINKS } from '../../data/profile.data';

@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RevealDirective],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {
  protected readonly i18n = inject(LanguageService);
  protected readonly t = computed(() => this.i18n.ui().contact);
  protected readonly profile = PROFILE;
  protected readonly socialLinks = SOCIAL_LINKS;
}
