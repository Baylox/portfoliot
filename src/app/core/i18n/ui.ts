import { PARCOURS } from '../../data/parcours.data';
import { PROFILE } from '../../data/profile.data';
import { PROJECTS } from '../../data/projects.data';
import { SKILL_GROUPS } from '../../data/skills.data';

/** Texte localisé d'une étape du parcours. */
export interface ParcoursStepText {
  readonly periode: string;
  readonly titre: string;
  readonly lieu: string;
  readonly detail: string;
}

/** Texte localisé d'un projet (le reste — nom, tags, url — vit dans data/). */
export interface ProjectText {
  readonly kind: string;
  readonly description: string;
}

/**
 * Toutes les chaînes d'interface. Une interface unique, deux exports : le
 * compilateur garantit la parité des clés entre FR et EN.
 */
export interface UiStrings {
  readonly nav: {
    readonly about: string;
    readonly skills: string;
    readonly parcours: string;
    readonly projects: string;
    readonly contact: string;
  };
  readonly header: {
    readonly backToTop: string;
    readonly mainNav: string;
    readonly labLink: string;
    readonly githubProfile: string;
    readonly neonToOrange: string;
    readonly neonToCyan: string;
    readonly neonTitle: string;
    readonly soundMute: string;
    readonly soundEnable: string;
    readonly soundTitle: string;
    readonly sequencerAria: string;
    readonly sequencerTitle: string;
    readonly openMenu: string;
    readonly switchLang: string;
  };
  readonly profile: {
    readonly role: string;
    readonly headline: string;
    readonly tagline: string;
    readonly about: readonly string[];
  };
  readonly hero: {
    readonly greeting: string;
    readonly viewProjects: string;
    readonly getInTouch: string;
    /** Segments texte du hint — les <code>help/synth/score</code> restent dans le template. */
    readonly hintBefore: string;
    readonly hintMid1: string;
    readonly hintMid2: string;
    readonly hintEnd: string;
  };
  readonly terminalShell: {
    readonly outputAria: string;
    readonly inputAria: string;
  };
  readonly about: {
    readonly title: string;
    readonly highlights: readonly { readonly value: string; readonly label: string }[];
  };
  readonly skills: {
    readonly title: string;
    /** Titre de groupe localisé, indexé par le titre FR de data/. */
    readonly groups: Readonly<Record<string, string>>;
  };
  readonly parcours: {
    readonly title: string;
    readonly steps: readonly ParcoursStepText[];
  };
  readonly projects: {
    readonly title: string;
    readonly othersTitle: string;
    readonly cta: string;
    /** kind + description localisés, indexés par le nom du projet. */
    readonly byName: Readonly<Record<string, ProjectText>>;
    /** Tags à traduire (les autres — Symfony, Python… — sont neutres). */
    readonly tags: Readonly<Record<string, string>>;
  };
  readonly contact: {
    readonly index: string;
    readonly title: string;
    readonly text: string;
  };
  readonly footer: {
    readonly proof: string;
    readonly proofLink: string;
    readonly designedWith: string;
    readonly endOfTransmission: string;
  };
  readonly pads: {
    readonly dialogAria: string;
    readonly title: string;
    readonly close: string;
    readonly stepAria: (inst: string, step: number) => string;
    /** Segments texte du hint — le <code>score</code> reste dans le template. */
    readonly hintBefore: string;
    readonly hintEnd: string;
    readonly empty: string;
    readonly startSynth: string;
  };
}

export const UI_FR: UiStrings = {
  nav: {
    about: 'À propos',
    skills: 'Compétences',
    parcours: 'Parcours',
    projects: 'Projets',
    contact: 'Contact',
  },
  header: {
    backToTop: 'Retour en haut de page',
    mainNav: 'Navigation principale',
    labLink: 'Lab',
    githubProfile: 'Profil GitHub',
    neonToOrange: 'Passer le néon en orange',
    neonToCyan: 'Passer le néon en cyan',
    neonTitle: 'Changer la couleur du néon',
    soundMute: 'Couper l’ambiance sonore',
    soundEnable: 'Activer l’ambiance sonore',
    soundTitle: 'Ambiance sonore générative (aucun sample)',
    sequencerAria: 'Séquenceur graphique',
    sequencerTitle: 'Séquenceur — composez en cliquant',
    openMenu: 'Ouvrir le menu',
    switchLang: 'Switch to English',
  },
  profile: {
    role: PROFILE.role,
    headline: PROFILE.headline,
    tagline: PROFILE.tagline,
    about: PROFILE.about,
  },
  hero: {
    greeting: '// transmission entrante — canal sécurisé',
    viewProjects: 'Voir mes projets',
    getInTouch: 'Me contacter',
    hintBefore: 'Un vrai shell : tapez ',
    hintMid1: ', lancez le ',
    hintMid2: ', puis composez avec ',
    hintEnd: '.',
  },
  terminalShell: {
    outputAria: 'Sortie du terminal',
    inputAria: 'Ligne de commande interactive',
  },
  about: {
    title: 'À propos',
    highlights: [
      { value: '35+', label: 'Projets open source' },
      { value: '3', label: 'Frameworks backend pratiqués' },
      { value: '100/100', label: 'Accessibilité Lighthouse' },
    ],
  },
  skills: {
    title: 'Compétences',
    groups: Object.fromEntries(SKILL_GROUPS.map((g) => [g.title, g.title])),
  },
  parcours: {
    title: 'Parcours',
    steps: PARCOURS.map(({ periode, titre, lieu, detail }) => ({ periode, titre, lieu, detail })),
  },
  projects: {
    title: 'Projets',
    othersTitle: 'Autres explorations',
    cta: 'Explorer les 35+ dépôts sur GitHub',
    byName: Object.fromEntries(
      PROJECTS.map((p) => [p.name, { kind: p.kind, description: p.description }]),
    ),
    tags: {},
  },
  contact: {
    index: '05. Et maintenant ?',
    title: 'Travaillons ensemble',
    text: "Un projet backend exigeant, une API à structurer, ou simplement envie d'échanger sur l'architecture logicielle ? Ma boîte mail est ouverte — je réponds à chaque message.",
  },
  footer: {
    proof:
      'Ce site est sa propre démonstration : Angular zoneless sans dépendance externe, moteur audio maison testé, CI, accessibilité Lighthouse 100/100.',
    proofLink: 'Code source ouvert',
    designedWith: 'Conçu et développé avec',
    endOfTransmission: '// fin de transmission_',
  },
  pads: {
    dialogAria: 'Séquenceur graphique',
    title: 'pads — séquenceur live',
    close: 'Fermer le séquenceur',
    stepAria: (inst, step) => `${inst}, pas ${step}`,
    hintBefore:
      'Cliquez les cases : le pattern change à la mesure suivante. Même chose au clavier dans le terminal : ',
    hintEnd: '.',
    empty: 'Le synthé est coupé — la grille attend ses instruments.',
    startSynth: 'Lancer le synthé',
  },
};

export const UI_EN: UiStrings = {
  nav: {
    about: 'About',
    skills: 'Skills',
    parcours: 'Background',
    projects: 'Projects',
    contact: 'Contact',
  },
  header: {
    backToTop: 'Back to top',
    mainNav: 'Main navigation',
    labLink: 'Lab',
    githubProfile: 'GitHub profile',
    neonToOrange: 'Switch the neon to orange',
    neonToCyan: 'Switch the neon to cyan',
    neonTitle: 'Change the neon color',
    soundMute: 'Mute the ambient sound',
    soundEnable: 'Enable the ambient sound',
    soundTitle: 'Generative ambient sound (no samples)',
    sequencerAria: 'Visual sequencer',
    sequencerTitle: 'Sequencer — compose by clicking',
    openMenu: 'Open menu',
    switchLang: 'Passer en français',
  },
  profile: {
    role: 'Back-end Developer',
    headline: 'Backend first, product always.',
    tagline:
      'I build robust, maintainable applications with Symfony, Spring Boot and NestJS — with a clear focus on software architecture: Clean Architecture, DDD and SOLID principles.',
    about: [
      'As a back-end developer, I build systems designed to last: well-defined domains, clean APIs, tested code. Symfony is home; Spring Boot and NestJS are where I explore.',
      'My direction is software architecture — turning fuzzy requirements into a readable structure. Clean Architecture, DDD, SOLID: not out of dogma, but because well-structured code is code you can evolve without fear.',
      'The rest of the time, some thirty open-source projects serve as my lab: AI tooling, distributed systems… and above all coded music — I compose with Strudel for the fun of it, and that passion is what sparked the live-codable sequencer hidden somewhere on this page.',
    ],
  },
  hero: {
    greeting: '// incoming transmission — secure channel',
    viewProjects: 'View my projects',
    getInTouch: 'Get in touch',
    hintBefore: 'A real shell — type ',
    hintMid1: ', fire up the ',
    hintMid2: ', then improvise with ',
    hintEnd: '…',
  },
  terminalShell: {
    outputAria: 'Terminal output',
    inputAria: 'Interactive command line',
  },
  about: {
    title: 'About',
    highlights: [
      { value: '35+', label: 'Open-source projects' },
      { value: '3', label: 'Backend frameworks mastered' },
      { value: '100%', label: 'Code built to last' },
    ],
  },
  skills: {
    title: 'Skills',
    groups: {
      Backend: 'Backend',
      'Bases de données & ORM': 'Databases & ORM',
      'Architecture & DevOps': 'Architecture & DevOps',
      Frontend: 'Frontend',
      'Qualité & Tests': 'Quality & Testing',
    },
  },
  parcours: {
    title: 'Background',
    steps: [
      {
        periode: 'since Sept 2025',
        titre: 'Back-end Symfony Developer — apprenticeship',
        lieu: 'French Ministry of the Interior, Lyon',
        detail: 'Designing and evolving a line-of-business application, from domain layer to UI.',
      },
      {
        periode: '2025 — 2026',
        titre: 'Application Design & Development — RNCP Level 6 (bachelor’s level)',
        lieu: 'Dawan — work-study program',
        detail: 'Degree in progress.',
      },
      {
        periode: '2023 — 2025',
        titre: 'Web & Mobile Developer — RNCP Level 5 (associate’s level)',
        lieu: 'Studi, Lyon',
        detail: 'Specialized in back-end and mobile development.',
      },
    ],
  },
  projects: {
    title: 'Projects',
    othersTitle: 'Other explorations',
    cta: 'Browse all 35+ repositories on GitHub',
    byName: {
      portfoliot: {
        kind: 'Interactive showcase',
        description:
          'This very site: zoneless Angular 21 with no external dependencies, a live-codable electro sequencer in pure Web Audio, a hand-built 3D Canvas background, CI, and a 100/100 Lighthouse accessibility score. The code you are looking at.',
      },
      algo: {
        kind: 'Teaching',
        description:
          'A collection of JavaScript algorithm exercises designed for beginners: progressive problems with detailed solutions, meant to be redone on your own.',
      },
      'multigame-js': {
        kind: 'Team project',
        description:
          'A mini-game platform built by a team of six: each member designs their own game, the team integrates the whole. Fifteen commits of mine — and above all, the experience of shipping together on a shared repository.',
      },
      taskio: {
        kind: 'Web application',
        description:
          'Collaborative project management: drag-and-drop Kanban boards, role-based permissions via Voters, email invitations. 570+ commits, a test suite and documentation — open source (MIT).',
      },
      'sentinel-py': {
        kind: 'Security',
        description:
          'Modular vulnerability scanner: port scanning, SSL certificate analysis and HTTP header inspection, in a lightweight, extensible tool.',
      },
      'its-not-skynet': {
        kind: 'AI',
        description:
          'Audited resources for AI-assisted development: skills, hooks, subagents and configs, validated by humans.',
      },
      'kafka-mock': {
        kind: 'Distributed systems',
        description:
          'Simulated Kafka v3.x+ broker in Python: ideal for testing consumers and producers without heavy infrastructure.',
      },
      arcadia: {
        kind: 'Web application',
        description:
          'Zoo management system: a full back office built with Symfony, MongoDB and Twig.',
      },
      'raw-http-server-js': {
        kind: 'Systems',
        description:
          'An HTTP/1.1 server built without any framework, to understand the protocol from the inside.',
      },
      'alda-support': {
        kind: 'Web application',
        description:
          'Custom CRM for a freelance sales closer: prospecting, follow-ups, closing and commission tracking on collected revenue. Symfony 7.4, PostgreSQL 16, Turbo + Stimulus.',
      },
      bailamos: {
        kind: 'Web application',
        description:
          'Website for BSK dance (bachata, salsa, kizomba): course discovery, private lesson booking and an event calendar.',
      },
      galaxy: {
        kind: '3D',
        description:
          'Red galaxy simulation in Three.js — first steps in 3D: scene, textures and animations.',
      },
      sigmajack: {
        kind: 'Game',
        description:
          'Interactive blackjack in vanilla JavaScript: dynamic game mechanics and a responsive interface.',
      },
      neatify: {
        kind: 'CLI',
        description:
          'Java CLI that tidies a folder by sorting files into categories (Documents, Images, Videos…) based on their extension.',
      },
      'shell-js': {
        kind: 'Systems',
        description: 'A shell implementation in Node.js with autocompletion.',
      },
    },
    tags: {
      Sécurité: 'Security',
      Jeu: 'Game',
    },
  },
  contact: {
    index: "05. What's next?",
    title: "Let's work together",
    text: 'A serious backend project, an API that needs structure, or just an urge to talk Clean Architecture? My inbox is open — I always reply.',
  },
  footer: {
    proof:
      'This site is its own proof of work — zoneless Angular with zero dependencies, a hand-built, tested audio sequencer, CI, and a 100/100 Lighthouse accessibility score.',
    proofLink: 'Source code available',
    designedWith: 'Designed and built with',
    endOfTransmission: '// end of transmission_',
  },
  pads: {
    dialogAria: 'Visual sequencer',
    title: 'pads — live sequencer',
    close: 'Close the sequencer',
    stepAria: (inst, step) => `${inst}, step ${step}`,
    hintBefore:
      'Click the cells — the music changes on the next bar. The terminal does the same from the keyboard: ',
    hintEnd: '.',
    empty: 'The synth is off — the grid is waiting for its instruments.',
    startSynth: 'Start the synth',
  },
};
