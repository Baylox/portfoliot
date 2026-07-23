import { euclid, seq } from './notation';

/**
 * Partition de l'ambiance — tout est déclaratif, le moteur ne fait que lire.
 * La mesure est une grille de 16 doubles-croches à 92 BPM. Électro sombre
 * et cinématique : kick lourd sur chaque temps, clap sur 2 et 4, basse-riff
 * staccato en ostinato, triades mineures qui montent en parallèle, le tout
 * creusé par le sidechain. Composition originale — l'inspiration est un
 * style, pas une partition.
 */

export const BPM = 92;

/** Swing 52 % : presque droit — la menace est machinale, pas chaloupée. */
export const SWING = 0.52;

export type SectionName = 'A' | 'B';

export interface ChordDef {
  /** Voicing du pad en MIDI, fondamentale doublée à l'octave en sommet ;
   *  la basse joue la fondamentale grave séparément. */
  pad: number[];
  /** Fondamentale de la basse en MIDI. */
  bass: number;
  /** Septième DIATONIQUE du fill de basse, en demi-tons (10 mineure, 11 majeure). */
  seventh: number;
}

/**
 * Section A : pédale de tonique (Am, deux mesures graves puis relevées d'une
 * inversion) puis bVI — bVII en triades PARALLÈLES — la montée F → G → (Am)
 * est le geste harmonique rétro-futuriste par excellence. Section B : iv — bVI — bVII — i,
 * même grammaire, résolution sur la tonique. Triades pures (pas de 9e jazzy),
 * tout en La mineur naturel ; la septième du fill est donnée par accord.
 */
export const SECTIONS: Record<SectionName, ChordDef[]> = {
  A: [
    { pad: [57, 60, 64, 69], bass: 33, seventh: 10 }, // Am  (A3 C4 E4 A4 / A1)
    { pad: [60, 64, 69, 72], bass: 33, seventh: 10 }, // Am  relevé (C4 E4 A4 C5 / A1)
    { pad: [53, 57, 60, 65], bass: 29, seventh: 11 }, // F   (F3 A3 C4 F4 / F1)
    { pad: [55, 59, 62, 67], bass: 31, seventh: 10 }, // G   (G3 B3 D4 G4 / G1)
  ],
  B: [
    { pad: [53, 57, 62, 65], bass: 38, seventh: 10 }, // Dm  (F3 A3 D4 F4 / D2)
    { pad: [53, 57, 60, 65], bass: 29, seventh: 11 }, // F   (F3 A3 C4 F4 / F1)
    { pad: [55, 59, 62, 67], bass: 31, seventh: 10 }, // G   (G3 B3 D4 G4 / G1)
    { pad: [57, 60, 64, 69], bass: 33, seventh: 10 }, // Am  (A3 C4 E4 A4 / A1)
  ],
};

/** Probabilité de quitter A pour le pont B à la fin d'une section. */
export const P_BRIDGE = 0.3;

/**
 * Basse-riff : ostinato staccato fondamentale/quinte/octave — c'est LE hook.
 * La quinte et l'octave restent consonantes sur chaque accord, le riff se
 * transpose donc tel quel avec l'harmonie.
 */
export const BASS = seq('0 ~ 0:.7 ~ ~ 0:.45 ~ 12:.8 0 ~ 0:.7 7:.8 ~ 12:.8 ~ 0:.6');

/**
 * Motif d'arpège : une vague montée-descente sur les notes de l'accord
 * (0–3 = notes du voicing, n ≥ 4 = note d'index n−4 à l'octave), répétée
 * deux fois par mesure — l'hypnose synthwave vient de la répétition, pas
 * du hasard. L'apex est « 5 » (2e note à l'octave) : les voicings doublent
 * déjà la fondamentale en position 3, « 4 » referait la même note.
 */
export const ARP = seq('0 1 2 3 5:.8 3 2 1 0 1 2 3 5:.8 3 2 1');

/** Kick four-on-the-floor (x.x.x.x.) — le cœur électro. */
export const KICK = euclid(4, 8, 0.95);

/** Clap synthétique sur les temps 2 et 4 — le backbeat lourd. */
export const CLAP = seq('~ ~ x:.9 ~ ~ ~ x:.9 ~');

/**
 * Stabs de cuivres : coup franc sur le temps 1 (avec le changement d'accord),
 * écho affaibli sur le « et » du 3e temps — uniquement les mesures paires.
 */
export const STAB = seq('x ~ ~ ~ ~ x:.7 ~ ~');

/** Hats « tss » sur les contretemps + couche fantôme euclidienne en doubles. */
export const HATS = seq('~ x:.8 ~ x:.8 ~ x:.8 ~ x:.8');
export const HATS_GHOST = euclid(5, 16, 0.4);

/** Perc métallique, rare. */
export const PERC = euclid(3, 16, 0.3);

/** Pentatonique de La mineur, registre médium — des « lueurs » lentes, pas des clochettes. */
export const SPARKLE_NOTES = [69, 72, 76, 79, 84];

/** Probabilités par pas (ou par mesure pour sparkle). */
export const P = {
  /** Le motif est fixe ; on saute juste une note de temps en temps (humanisation). */
  arpPlay: 0.95,
  kick: 0.97,
  clap: 0.97,
  stab: 0.85,
  hat: 0.95,
  hatGhost: 0.45,
  openHat: 0.3,
  perc: 0.25,
  sparkle: 0.05,
} as const;
