import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Icon } from '../../core/icon';
import { LanguageService } from '../../core/i18n/language.service';
import { RevealDirective } from '../../core/reveal.directive';
import { FEATURED_PROJECTS, OTHER_PROJECTS, Project } from '../../data/projects.data';
import { PROFILE } from '../../data/profile.data';

@Component({
  selector: 'app-projects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RevealDirective],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects {
  protected readonly i18n = inject(LanguageService);
  protected readonly t = computed(() => this.i18n.ui().projects);
  protected readonly githubUrl = PROFILE.githubUrl;

  protected readonly featured = computed(() => this.localize(FEATURED_PROJECTS));
  protected readonly others = computed(() => this.localize(OTHER_PROJECTS));

  /** kind, description et tags localisés — le reste vient de data/. */
  private localize(projects: readonly Project[]): Project[] {
    const { byName, tags } = this.t();
    return projects.map((project) => ({
      ...project,
      kind: byName[project.name]?.kind ?? project.kind,
      description: byName[project.name]?.description ?? project.description,
      tags: project.tags.map((tag) => tags[tag] ?? tag),
    }));
  }
}
