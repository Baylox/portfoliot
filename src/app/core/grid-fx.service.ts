import { Injectable, signal } from '@angular/core';

/**
 * Canal de communication vers le fond animé : le terminal (ou n'importe quel
 * composant) peut y déclencher une vague de traceurs lumineux supplémentaires.
 */
@Injectable({ providedIn: 'root' })
export class GridFxService {
  /** Incrémenté à chaque demande de renfort — le canvas écoute ce signal. */
  readonly burst = signal(0);

  requestBurst(): void {
    this.burst.update((n) => n + 1);
  }
}
