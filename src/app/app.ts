import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NeonBackground } from './core/neon-background/neon-background';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { Pads } from './layout/pads/pads';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NeonBackground, Header, Footer, Pads, RouterOutlet],
  template: `
    <app-neon-background />
    <app-header />
    <router-outlet />
    <app-footer />
    <app-pads />
    <div class="fx-scanlines" aria-hidden="true"></div>
    <div class="fx-vignette" aria-hidden="true"></div>
  `,
})
export class App {}
