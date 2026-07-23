import { computed, effect, Injectable, signal } from '@angular/core';
import { UI_EN, UI_FR, UiStrings } from './ui';
import { TERM_EN, TERM_FR, TermStrings } from './terminal';

/** Langues servies par le portfolio. */
export type Lang = 'fr' | 'en';

const STORAGE_KEY = 'lang';

/** Title / meta description par langue (SEO léger, cf. index.html). */
const META: Record<Lang, { title: string; description: string }> = {
  fr: {
    title: 'Joris Dupont-Alamo — Développeur Back-end',
    description:
      'Portfolio de Joris Dupont-Alamo, développeur back-end Symfony, orienté architecture logicielle : Clean Architecture, DDD, SOLID. Spring Boot, NestJS, Angular.',
  },
  en: {
    title: 'Joris Dupont-Alamo — Back-end Developer',
    description:
      'Portfolio of Joris Dupont-Alamo, back-end Symfony developer focused on software architecture: Clean Architecture, DDD, SOLID. Spring Boot, NestJS, Angular.',
  },
};

/**
 * Langue du site : un signal, deux dictionnaires. La bascule est instantanée
 * (zoneless + signals) — seules les lignes déjà affichées du terminal restent
 * dans leur langue d'origine, comme dans un vrai shell.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly lang = signal<Lang>(detect());

  /** Chaînes d'interface de la langue courante. */
  readonly ui = computed<UiStrings>(() => (this.lang() === 'fr' ? UI_FR : UI_EN));

  /** Chaînes du terminal — lues au moment où une commande s'exécute. */
  readonly term = computed<TermStrings>(() => (this.lang() === 'fr' ? TERM_FR : TERM_EN));

  constructor() {
    effect(() => {
      const lang = this.lang();
      try {
        document.documentElement.lang = lang;
        document.title = META[lang].title;
        document
          .querySelector('meta[name="description"]')
          ?.setAttribute('content', META[lang].description);
      } catch {
        // Environnement sans DOM complet (jsdom minimal) : la langue reste en mémoire.
      }
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Stockage indisponible (navigation privée) : la langue reste en mémoire.
      }
    });
  }

  toggle(): void {
    this.lang.update((lang) => (lang === 'fr' ? 'en' : 'fr'));
  }

  set(lang: Lang): void {
    this.lang.set(lang);
  }
}

/** Priorité : ?lang= dans l'URL > localStorage > langue du navigateur > fr. */
function detect(): Lang {
  try {
    const fromUrl = new URLSearchParams(location.search).get(STORAGE_KEY);
    if (fromUrl === 'fr' || fromUrl === 'en') {
      return fromUrl;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') {
      return stored;
    }
    return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  } catch {
    return 'fr';
  }
}
