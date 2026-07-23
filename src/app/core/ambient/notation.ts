/**
 * Mini-moteur de patterns — notation inspirée de Strudel, zéro dépendance.
 *
 * Un pattern décrit une mesure sur une grille de 16 doubles-croches.
 * `seq('0 ~ 0 12')` divise la mesure en autant de pas égaux qu'il y a de
 * jetons (4, 8 ou 16) ; chaque jeton est un offset en demi-tons relatif à
 * la fondamentale de l'accord courant, `x` vaut 0, `~` est un silence, et
 * `:v` fixe la vélocité (ex. `0:.45`).
 * `euclid(3, 8)` répartit 3 impacts sur 8 pas (rythme euclidien).
 */

/** Résolution de la grille : 16 doubles-croches par mesure. */
export const GRID = 16;

export interface StepEvent {
  /** Position sur la grille de doubles-croches (0–15). */
  step: number;
  /** Offset en demi-tons par rapport à la fondamentale. */
  offset: number;
  /** Vélocité 0..1. */
  vel: number;
  /** Durée nominale en pas de grille. */
  lenSteps: number;
}

export function seq(pattern: string): StepEvent[] {
  const tokens = pattern.trim().split(/\s+/);
  if (GRID % tokens.length !== 0) {
    throw new Error(`seq: ${tokens.length} pas ne divisent pas la grille de ${GRID}`);
  }
  const span = GRID / tokens.length;
  const events: StepEvent[] = [];
  tokens.forEach((token, i) => {
    if (token === '~') {
      return;
    }
    const [head, vel] = token.split(':');
    events.push({
      step: i * span,
      offset: head === 'x' ? 0 : Number(head),
      vel: vel !== undefined ? Number(vel) : 1,
      lenSteps: span,
    });
  });
  return events;
}

/** Rythme euclidien (Bresenham) : k impacts sur n pas, projetés sur la grille. */
export function euclid(k: number, n: number, vel = 1): StepEvent[] {
  if (GRID % n !== 0) {
    throw new Error(`euclid: ${n} pas ne divisent pas la grille de ${GRID}`);
  }
  const span = GRID / n;
  const events: StepEvent[] = [];
  for (let i = 0; i < n; i++) {
    if ((i * k) % n < k) {
      events.push({ step: i * span, offset: 0, vel, lenSteps: span });
    }
  }
  return events;
}

/** L'événement déclenché exactement à ce pas de grille, s'il existe. */
export function at(events: StepEvent[], step: number): StepEvent | undefined {
  return events.find((e) => e.step === step);
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
