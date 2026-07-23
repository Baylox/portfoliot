import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Hero } from '../sections/hero/hero';
import { About } from '../sections/about/about';
import { Skills } from '../sections/skills/skills';
import { Parcours } from '../sections/parcours/parcours';
import { Projects } from '../sections/projects/projects';
import { Contact } from '../sections/contact/contact';

/** La page d'accueil : le one-page historique, inchangé. */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Hero, About, Skills, Parcours, Projects, Contact],
  template: `
    <main>
      <app-hero />
      <app-about />
      <app-skills />
      <app-parcours />
      <app-projects />
      <app-contact />
    </main>
  `,
})
export class Home {}
