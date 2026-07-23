import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Icon } from '../../core/icon';
import { LanguageService } from '../../core/i18n/language.service';
import { RevealDirective } from '../../core/reveal.directive';
import { SKILL_GROUPS } from '../../data/skills.data';

@Component({
  selector: 'app-skills',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RevealDirective],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
})
export class Skills {
  protected readonly i18n = inject(LanguageService);
  protected readonly t = computed(() => this.i18n.ui().skills);

  /** Groupes de data/, titre localisé via le dictionnaire. */
  protected readonly skillGroups = computed(() => {
    const titles = this.t().groups;
    return SKILL_GROUPS.map((group) => ({
      ...group,
      title: titles[group.title] ?? group.title,
    }));
  });
}
