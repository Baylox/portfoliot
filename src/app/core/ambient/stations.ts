import { LivePattern } from './live-patterns';

/**
 * Les stations de la radio — des partitions alternatives écrites dans la
 * mini-notation, appliquées d'un bloc sur le moteur. `circuit` (la partition
 * d'origine) n'est pas ici : c'est un simple resetPatterns().
 */
export const STATION_PATTERNS: Record<'ambient' | 'club', Record<LivePattern, string>> = {
  // Planante : pas de batterie, une basse posée, un arpège au ralenti.
  ambient: {
    bass: '0 ~ ~ ~ ~ ~ ~ ~ 12:.5 ~ ~ ~ ~ ~ ~ ~',
    kick: '~ ~ ~ ~',
    hats: '~ ~ ~ ~',
    ghost: '~ x:.2 ~ ~ ~ ~ x:.2 ~ ~ ~ ~ ~ x:.2 ~ ~ ~',
    perc: '~ ~ ~ ~',
    arp: '0 ~ ~ 1 ~ ~ 2 ~ ~ 3 ~ ~ 4:.6 ~ 2:.5 ~',
    clap: '~ ~ ~ ~',
    stab: '~ ~ ~ ~',
  },
  // Dense : ghost kicks, basse roulante en doubles, hats serrés.
  club: {
    bass: '0 0:.45 0:.7 0:.45 0 0:.45 12:.8 0:.45 0 0:.45 0:.7 7:.7 0 0:.45 12:.8 0:.45',
    kick: 'x:.95 ~ ~ ~ x:.95 ~ ~ x:.55 x:.95 ~ ~ ~ x:.95 ~ x:.5 ~',
    hats: '~ x:.8 x:.4 x:.8 ~ x:.8 x:.4 x:.8',
    ghost: 'x:.3 ~ x:.3 ~ x:.3 ~ x:.3 ~ x:.3 ~ x:.3 ~ x:.3 ~ x:.3 ~',
    perc: '~ ~ ~ x:.4 ~ ~ ~ ~ ~ ~ x:.4 ~ ~ ~ ~ ~',
    arp: '0 1 2 3 5:.8 3 2 1 0 1 2 3 5:.8 3 2 1',
    clap: '~ ~ x:.9 ~ ~ ~ x:.9 ~',
    stab: 'x ~ ~ ~ ~ x:.7 ~ ~ x:.8 ~ ~ ~ ~ x:.7 ~ ~',
  },
};
