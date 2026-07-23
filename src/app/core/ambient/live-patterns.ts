/**
 * Instruments dont le pattern se remplace en direct (commande `score` du
 * terminal — le live-coding façon Strudel, sur le séquenceur maison).
 * Module minuscule et sans dépendance : partagé entre le bundle initial
 * (façade, terminal) et le chunk du moteur.
 */
export const LIVE_PATTERNS = [
  'bass',
  'kick',
  'hats',
  'ghost',
  'perc',
  'arp',
  'clap',
  'stab',
] as const;

export type LivePattern = (typeof LIVE_PATTERNS)[number];

/** Stations de la commande `radio` — les partitions vivent dans le chunk lazy. */
export const STATIONS = ['circuit', 'ambient', 'club'] as const;

export type Station = (typeof STATIONS)[number];
