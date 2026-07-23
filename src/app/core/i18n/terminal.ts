/**
 * Chaînes du terminal `baylox-sh`. Une interface unique, deux exports : la
 * parité des clés FR/EN est garantie par le compilateur. Les commandes lisent
 * le dictionnaire au moment de leur exécution — les lignes déjà affichées
 * restent dans leur langue d'origine, comme dans un vrai shell.
 */

/** Aide d'une commande (colonne de droite du `help`). */
export interface TermHelp {
  readonly help: string;
  readonly whoami: string;
  readonly ls: string;
  readonly cat: string;
  readonly skills: string;
  readonly projects: string;
  readonly contact: string;
  readonly github: string;
  readonly neofetch: string;
  readonly neon: string;
  readonly synth: string;
  readonly vu: string;
  readonly score: string;
  readonly pads: string;
  readonly radio: string;
  readonly rec: string;
  readonly overdrive: string;
  readonly history: string;
  readonly clear: string;
  readonly rm: string;
  readonly sudo: string;
  readonly lang: string;
}

export interface TermStrings {
  readonly helpOf: TermHelp;
  readonly architectureAscii: string;
  readonly files: {
    readonly aboutTxt: readonly string[];
    readonly architectureNote: string;
  };
  readonly boot: {
    readonly recovered: string;
    readonly welcome: string;
    readonly hint: string;
  };
  readonly notFound: (name: string) => string;
  readonly tryHelp: string;
  readonly helpHeader: string;
  readonly helpFooter: string;
  readonly catMissing: string;
  readonly catNotFound: (file: string) => string;
  readonly projectsHint: string;
  readonly githubOpening: (url: string) => string;
  readonly neofetch: {
    readonly os: string;
    readonly shell: string;
    readonly stack: string;
    readonly front: (version: string) => string;
    readonly neon: (accent: string) => string;
    readonly uptime: string;
  };
  readonly neonCyan: string;
  readonly neonOrange: string;
  readonly synthOn: string;
  readonly synthOnHint: string;
  readonly synthOff: string;
  readonly synthIsOff: string;
  readonly engineBooting: string;
  readonly scoreReset: string;
  readonly scoreUsage: readonly string[];
  readonly scoreInstruments: (list: string) => string;
  readonly scoreLegend: string;
  readonly scoreResetHint: string;
  readonly scoreUnknown: (inst: string) => string;
  readonly scoreError: (message: string) => string;
  readonly scoreInvalidPattern: string;
  readonly radioHeader: string;
  readonly radioFooter: string;
  readonly radioUnknown: (name: string) => string;
  readonly radioTuned: (name: string) => string;
  readonly recRendering: (seconds: number) => string;
  readonly recUnsupported: string;
  readonly recDone: (seconds: number) => string;
  readonly padsOpened: string;
  readonly padsClosed: string;
  readonly vuOff: string;
  readonly vuOffSynth: string;
  readonly rmTimid: string;
  readonly rmRemoving: (path: string) => string;
  readonly overdrive: string;
  readonly overdriveEnd: string;
  readonly historyEmpty: string;
  readonly sudoGranted: string;
  readonly sudoDenied: (user: string) => string;
  readonly langCurrent: (lang: string, other: string) => string;
  readonly langUnknown: (name: string) => string;
  readonly langSwitched: (lang: string) => string;
}

const ARCHITECTURE_ASCII_FR = String.raw`
 bundle initial (~56 ko gzip)      chunk lazy (~4 ko gzip)
 ┌─────────────────────────┐       ┌─────────────────────────┐
 │  terminal · baylox-sh   │       │  AmbientEngine          │
 │  pads · séquenceur      │       │  ├ scheduler lookahead  │
 │       │        │        │       │  ├ horloge Worker       │
 │       ▼        ▼        │       │  ├ patterns mutables    │
 │  AmbientAudioService ───┼──────▶│  ├ synthèse + FX        │
 │  (façade, import lazy)  │       │  └ notation ─ score     │
 │       ▲                 │       │           │             │
 │  NeonBackground ◀───────┼───────┼── level · pulse · kicks │
 └─────────────────────────┘       └─────────────────────────┘`;

const ARCHITECTURE_ASCII_EN = String.raw`
 initial bundle (~56 KB gzip)      lazy chunk (~4 KB gzip)
 ┌─────────────────────────┐       ┌─────────────────────────┐
 │  terminal · baylox-sh   │       │  AmbientEngine          │
 │  pads · sequencer       │       │  ├ scheduler lookahead  │
 │       │        │        │       │  ├ Worker clock         │
 │       ▼        ▼        │       │  ├ mutable patterns     │
 │  AmbientAudioService ───┼──────▶│  ├ synthesis + FX       │
 │  (facade, lazy import)  │       │  └ notation ─ score     │
 │       ▲                 │       │           │             │
 │  NeonBackground ◀───────┼───────┼── level · pulse · kicks │
 └─────────────────────────┘       └─────────────────────────┘`;

export const TERM_FR: TermStrings = {
  helpOf: {
    help: 'liste des commandes',
    whoami: "identité de l'hôte",
    ls: 'liste les fichiers',
    cat: 'affiche un fichier (cat about.txt)',
    skills: 'compétences par domaine',
    projects: 'projets (--all pour tout)',
    contact: 'me joindre',
    github: 'ouvre mon profil GitHub',
    neofetch: 'infos système',
    neon: 'bascule le néon cyan ⇄ orange',
    synth: 'ambiance sonore générative on/off',
    vu: 'vu-mètre du synthé',
    score: 'live-coding : remplace un pattern',
    pads: 'séquenceur graphique',
    radio: 'change de station',
    rec: 'exporte votre séquence en .wav',
    overdrive: '???',
    history: 'historique des commandes',
    clear: 'efface le terminal',
    rm: 'supprime des fichiers',
    sudo: 'droits administrateur',
    lang: 'change de langue (lang en)',
  },
  architectureAscii: ARCHITECTURE_ASCII_FR,
  files: {
    aboutTxt: [
      'Développeur back-end Symfony — cap architecture logicielle.',
      'Symfony · Spring Boot · NestJS · Angular.',
      'Clean Architecture, DDD et SOLID au quotidien.',
    ],
    architectureNote: 'Deux interfaces, un moteur — le contenu vit dans data/.',
  },
  boot: {
    recovered: 'Récupération… segment /dev/joris restauré. Belle tentative.',
    welcome: 'Liaison établie. Bienvenue à bord.',
    hint: "Tapez 'help' pour la liste des commandes.",
  },
  notFound: (name) => `baylox-sh : commande introuvable : ${name}`,
  tryHelp: "Essayez 'help'.",
  helpHeader: 'Commandes disponibles :',
  helpFooter: 'Astuce : Tab pour compléter, ↑/↓ pour l’historique.',
  catMissing: 'cat : nom de fichier requis',
  catNotFound: (file) => `cat : ${file} : fichier introuvable`,
  projectsHint: "'projects --all' pour la liste complète.",
  githubOpening: (url) => `Ouverture de ${url}…`,
  neofetch: {
    os: 'OS       BayloxOS 5.0 (néon)',
    shell: 'Shell    baylox-sh 1.0',
    stack: 'Stack    Symfony · Spring Boot · NestJS',
    front: (version) => `Front    Angular ${version}`,
    neon: (accent) => `Néon     ${accent}`,
    uptime: 'Uptime   ∞',
  },
  neonCyan: 'Néon : cyan — circuit principal',
  neonOrange: 'Néon : orange — contre-circuit activé',
  synthOn:
    'Synthé : ON — électro générative maison (four-on-the-floor, sidechain), Web Audio pur, aucun sample.',
  synthOnHint:
    "Live-coding : 'score bass 0 ~ 0:.7 ~ ~ 0 ~ 12' remplace la basse en direct ('score' pour l'aide).",
  synthOff: 'Synthé ambiant : OFF.',
  synthIsOff: "Le synthé est coupé — lancez 'synth' d'abord.",
  engineBooting: 'Le moteur démarre encore — réessayez dans une seconde.',
  scoreReset: "Partition d'origine restaurée.",
  scoreUsage: [
    'score — live-coding du séquenceur (clin d’œil à Strudel) :',
    '  score <instrument> <pattern>   ex : score bass 0 ~ 0:.7 ~ ~ 0 ~ 12',
  ],
  scoreInstruments: (list) => `  instruments : ${list}`,
  scoreLegend:
    '  16 pas par mesure (4, 8 ou 16 jetons) · ~ silence · x frappe · nombres = demi-tons (bass) ou degrés (arp) · :v vélocité',
  scoreResetHint: "  'score reset' pour revenir à la partition d'origine.",
  scoreUnknown: (inst) => `score : instrument inconnu : ${inst}`,
  scoreError: (message) => `score : ${message}`,
  scoreInvalidPattern: 'pattern invalide',
  radioHeader: 'Stations :',
  radioFooter: 'radio <station> pour zapper.',
  radioUnknown: (name) => `radio : station inconnue : ${name}`,
  radioTuned: (name) => `Station : ${name}.`,
  recRendering: (seconds) => `Rendu de ${seconds} s en cours…`,
  recUnsupported: 'rec : rendu impossible sur ce navigateur.',
  recDone: (seconds) =>
    `baylox-jam.wav — ${seconds} s générées par votre navigateur, aucun sample.`,
  padsOpened: 'Séquenceur ouvert — cliquez les cases, la musique suit.',
  padsClosed: 'Séquenceur fermé.',
  vuOff: 'Vu-mètre : OFF.',
  vuOffSynth: 'Vu-mètre : OFF (synthé coupé).',
  rmTimid: 'rm : trop timide. Voyez plus grand.',
  rmRemoving: (path) => `suppression de ${path}…`,
  overdrive: 'Overdrive : traceurs supplémentaires déployés sur la grille.',
  overdriveEnd: '// fin de transmission',
  historyEmpty: '(vide)',
  sudoGranted: 'Permission accordée.',
  sudoDenied: (user) => `${user} n'a pas les droits sudo. Cet incident sera signalé.`,
  langCurrent: (lang, other) => `Langue : ${lang} — 'lang ${other}' pour basculer.`,
  langUnknown: (name) => `lang : langue inconnue : ${name}`,
  langSwitched: (lang) => `Langue : ${lang}.`,
};

export const TERM_EN: TermStrings = {
  helpOf: {
    help: 'list available commands',
    whoami: 'who am I?',
    ls: 'list files',
    cat: 'print a file (cat about.txt)',
    skills: 'skills by domain',
    projects: 'projects (--all for everything)',
    contact: 'how to reach me',
    github: 'open my GitHub profile',
    neofetch: 'system info',
    neon: 'toggle the neon cyan ⇄ orange',
    synth: 'generative ambient sound on/off',
    vu: 'synth VU meter',
    score: 'live coding: replace a pattern',
    pads: 'visual sequencer',
    radio: 'switch station',
    rec: 'export your beat as .wav',
    overdrive: '???',
    history: 'command history',
    clear: 'clear the terminal',
    rm: 'remove files',
    sudo: 'administrator privileges',
    lang: 'switch language (lang fr)',
  },
  architectureAscii: ARCHITECTURE_ASCII_EN,
  files: {
    aboutTxt: [
      'Back-end Symfony developer — heading toward software architecture.',
      'Symfony · Spring Boot · NestJS · Angular.',
      'Clean Architecture, DDD and SOLID, every day.',
    ],
    architectureNote: 'Two interfaces, one engine — content lives in data/.',
  },
  boot: {
    recovered: 'Recovering… segment /dev/joris restored. Nice try.',
    welcome: 'Link established. Welcome aboard.',
    hint: "Type 'help' to list available commands.",
  },
  notFound: (name) => `baylox-sh: command not found: ${name}`,
  tryHelp: "Try 'help'.",
  helpHeader: 'Available commands:',
  helpFooter: 'Tip: Tab to autocomplete, ↑/↓ for history.',
  catMissing: 'cat: missing file name',
  catNotFound: (file) => `cat: ${file}: no such file`,
  projectsHint: "'projects --all' for the full list.",
  githubOpening: (url) => `Opening ${url}…`,
  neofetch: {
    os: 'OS       BayloxOS 5.0 (neon)',
    shell: 'Shell    baylox-sh 1.0',
    stack: 'Stack    Symfony · Spring Boot · NestJS',
    front: (version) => `Front    Angular ${version}`,
    neon: (accent) => `Neon     ${accent}`,
    uptime: 'Uptime   ∞',
  },
  neonCyan: 'Neon: cyan — main circuit',
  neonOrange: 'Neon: orange — counter-circuit engaged',
  synthOn:
    'Synth: ON — homegrown generative electro (four-on-the-floor, sidechain), pure Web Audio, zero samples.',
  synthOnHint:
    "Live coding: 'score bass 0 ~ 0:.7 ~ ~ 0 ~ 12' swaps the bassline in real time ('score' for help).",
  synthOff: 'Ambient synth: OFF.',
  synthIsOff: "The synth is off — run 'synth' first.",
  engineBooting: 'The engine is still booting — try again in a second.',
  scoreReset: 'Original score restored.',
  scoreUsage: [
    'score — live-code the sequencer (a nod to Strudel):',
    '  score <instrument> <pattern>   e.g. score bass 0 ~ 0:.7 ~ ~ 0 ~ 12',
  ],
  scoreInstruments: (list) => `  instruments: ${list}`,
  scoreLegend:
    '  16 steps per bar (4, 8 or 16 tokens) · ~ rest · x hit · numbers = semitones (bass) or degrees (arp) · :v velocity',
  scoreResetHint: "  'score reset' to restore the original score.",
  scoreUnknown: (inst) => `score: unknown instrument: ${inst}`,
  scoreError: (message) => `score: ${message}`,
  scoreInvalidPattern: 'invalid pattern',
  radioHeader: 'Stations:',
  radioFooter: 'radio <station> to switch.',
  radioUnknown: (name) => `radio: unknown station: ${name}`,
  radioTuned: (name) => `Station: ${name}.`,
  recRendering: (seconds) => `Rendering ${seconds} s…`,
  recUnsupported: 'rec: rendering not supported in this browser.',
  recDone: (seconds) => `baylox-jam.wav — ${seconds} s generated by your browser, zero samples.`,
  padsOpened: 'Sequencer open — click the cells, the music follows.',
  padsClosed: 'Sequencer closed.',
  vuOff: 'VU meter: OFF.',
  vuOffSynth: 'VU meter: OFF (synth is off).',
  rmTimid: 'rm: too timid. Think bigger.',
  rmRemoving: (path) => `removing ${path}…`,
  overdrive: 'Overdrive: extra tracers deployed across the grid.',
  overdriveEnd: '// end of transmission',
  historyEmpty: '(empty)',
  sudoGranted: 'Permission granted.',
  sudoDenied: (user) => `${user} is not in the sudoers file. This incident will be reported.`,
  langCurrent: (lang, other) => `Language: ${lang} — 'lang ${other}' to switch.`,
  langUnknown: (name) => `lang: unknown language: ${name}`,
  langSwitched: (lang) => `Language: ${lang}.`,
};
