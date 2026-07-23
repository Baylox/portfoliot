import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AmbientAudioService } from '../../core/ambient-audio.service';
import { Icon } from '../../core/icon';
import { LanguageService } from '../../core/i18n/language.service';
import { PadsService } from '../../core/pads.service';
import { ThemeService } from '../../core/theme.service';
import { PROFILE } from '../../data/profile.data';

interface NavLink {
  label: string;
  fragment: string;
}

/** Les fragments sont des ids stables (URLs partageables) — seuls les labels changent. */
const NAV_FRAGMENTS = ['a-propos', 'competences', 'parcours', 'projets', 'contact'] as const;

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  protected readonly theme = inject(ThemeService);
  protected readonly audio = inject(AmbientAudioService);
  protected readonly padsPanel = inject(PadsService);
  protected readonly i18n = inject(LanguageService);
  protected readonly profile = PROFILE;

  protected readonly t = computed(() => this.i18n.ui().header);

  /** Langue CIBLE affichée sur le bouton (« EN » quand le site est en FR). */
  protected readonly targetLang = computed(() => (this.i18n.lang() === 'fr' ? 'EN' : 'FR'));

  protected readonly navLinks = computed<NavLink[]>(() => {
    const nav = this.i18n.ui().nav;
    const labels = [nav.about, nav.skills, nav.parcours, nav.projects, nav.contact];
    return NAV_FRAGMENTS.map((fragment, i) => ({ label: labels[i], fragment }));
  });

  protected readonly activeSection = signal('');
  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      this.watchScroll();
      this.watchSections();
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  private watchScroll(): void {
    const onScroll = () => this.scrolled.set(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
  }

  private watchSections(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activeSection.set(entry.target.id);
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );

    for (const link of this.navLinks()) {
      const section = document.getElementById(link.fragment);
      if (section) {
        observer.observe(section);
      }
    }
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
