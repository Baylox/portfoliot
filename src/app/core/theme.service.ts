import { effect, Injectable, signal } from '@angular/core';

/** Couleur du néon : circuit cyan ou contre-circuit orange. */
export type Accent = 'cyan' | 'orange';

const STORAGE_KEY = 'accent';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly accent = signal<Accent>(readInitialAccent());

  constructor() {
    effect(() => {
      const accent = this.accent();
      document.documentElement.setAttribute('data-accent', accent);
      try {
        localStorage.setItem(STORAGE_KEY, accent);
      } catch {
        // Stockage indisponible (navigation privée) : l'accent reste en mémoire.
      }
    });
  }

  toggle(): void {
    this.accent.update((accent) => (accent === 'cyan' ? 'orange' : 'cyan'));
  }
}

function readInitialAccent(): Accent {
  // ?accent=orange permet de partager le contre-circuit (prioritaire sur la
  // préférence enregistrée — même logique que le script d'amorçage).
  try {
    const fromUrl = new URLSearchParams(location.search).get(STORAGE_KEY);
    const accent = fromUrl ?? localStorage.getItem(STORAGE_KEY);
    return accent === 'orange' ? 'orange' : 'cyan';
  } catch {
    return 'cyan';
  }
}
