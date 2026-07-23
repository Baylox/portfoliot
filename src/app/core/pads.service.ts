import { Injectable, signal } from '@angular/core';

/** État d'ouverture du séquenceur graphique — piloté par le header et le terminal. */
@Injectable({ providedIn: 'root' })
export class PadsService {
  readonly open = signal(false);

  toggle(): void {
    this.open.update((open) => !open);
  }

  close(): void {
    this.open.set(false);
  }
}
