export interface Project {
  /** Nom affiché — kebab-case minuscule uniforme ; l'URL garde le vrai nom du dépôt. */
  name: string;
  kind: string;
  description: string;
  tags: string[];
  githubUrl: string;
  featured: boolean;
}

const GITHUB = 'https://github.com/Baylox';

// Projets originaux ou contributions réelles — les forks sans travail
// n'ont pas leur place ici. L'ordre des vedettes raconte le profil :
// la vitrine vivante d'abord, puis le cœur Symfony, puis les explorations.
export const PROJECTS: Project[] = [
  {
    name: 'portfoliot',
    kind: 'Vitrine interactive',
    description:
      'Ce site : Angular 21 zoneless sans dépendance externe, séquenceur électro live-codable en Web Audio pur, fond 3D en Canvas maison, CI et accessibilité Lighthouse 100/100. Le code que vous regardez.',
    tags: ['Angular', 'Web Audio', 'Canvas'],
    githubUrl: `${GITHUB}/portfoliot`,
    featured: true,
  },
  {
    name: 'taskio',
    kind: 'Application web',
    description:
      'Gestion de projets collaborative : tableaux Kanban en glisser-déposer, rôles et permissions via Voters, invitations par e-mail. Plus de 570 commits, suite de tests et documentation — open source (MIT).',
    tags: ['Symfony', 'MariaDB', 'Tailwind CSS'],
    githubUrl: `${GITHUB}/taskio`,
    featured: true,
  },
  {
    name: 'sentinel-py',
    kind: 'Sécurité',
    description:
      'Scanner de vulnérabilités modulaire : scan de ports, analyse de certificats SSL et inspection des en-têtes HTTP, dans un outil léger et extensible.',
    tags: ['Python', 'Sécurité', 'CLI'],
    githubUrl: `${GITHUB}/sentinel-py`,
    featured: true,
  },
  {
    name: 'its-not-skynet',
    kind: 'IA',
    description:
      'Ressources auditées pour le développement assisté par IA : skills, hooks, subagents et configurations, validés par relecture humaine.',
    tags: ['Shell', 'Claude Code', 'Markdown'],
    githubUrl: `${GITHUB}/its-not-skynet`,
    featured: true,
  },
  {
    name: 'kafka-mock',
    kind: 'Systèmes distribués',
    description:
      'Broker Kafka v3.x+ simulé en Python : tester consumers et producers sans infrastructure lourde.',
    tags: ['Python', 'Kafka', 'Testing'],
    githubUrl: `${GITHUB}/kafka-mock`,
    featured: true,
  },
  {
    name: 'alda-support',
    kind: 'Application web',
    description:
      'CRM sur-mesure pour une closeuse indépendante : prospection, relances, closing et suivi des commissions sur l’encaissé. Symfony 7.4, PostgreSQL 16, Turbo + Stimulus.',
    tags: ['Symfony', 'PostgreSQL', 'Turbo'],
    githubUrl: `${GITHUB}/alda-support`,
    featured: true,
  },
  {
    name: 'arcadia',
    kind: 'Application web',
    description: 'Gestion de parc zoologique : back-office complet — Symfony, MongoDB, Twig.',
    tags: ['Symfony', 'MongoDB', 'Twig'],
    githubUrl: `${GITHUB}/arcadia`,
    featured: false,
  },
  {
    name: 'raw-http-server-js',
    kind: 'Systèmes',
    description:
      'Serveur HTTP 1.1 construit sans framework, pour comprendre le protocole de l’intérieur.',
    tags: ['JavaScript', 'HTTP'],
    githubUrl: `${GITHUB}/raw-http-server-js`,
    featured: false,
  },
  {
    name: 'algo',
    kind: 'Pédagogie',
    description:
      'Collection d’exercices d’algorithmique en JavaScript pensée pour les débutants : énoncés progressifs et solutions détaillées, à refaire par soi-même.',
    tags: ['JavaScript', 'Algorithmique'],
    githubUrl: `${GITHUB}/algo`,
    featured: false,
  },
  {
    name: 'multigame-js',
    kind: 'Projet collaboratif',
    description:
      'Plateforme de mini-jeux construite à six : chacun conçoit le sien, l’équipe intègre l’ensemble. Quinze commits à mon actif, et surtout l’apprentissage du travail à plusieurs sur un même dépôt.',
    tags: ['JavaScript', 'PHP', 'Équipe'],
    githubUrl: 'https://github.com/MultigameJS/MultiGame-JS',
    featured: false,
  },
  {
    name: 'bailamos',
    kind: 'Application web',
    description:
      'Site dédié aux danses BSK (bachata, salsa, kizomba) : catalogue de cours, réservation de leçons privées, agenda des événements.',
    tags: ['PHP', 'Web'],
    githubUrl: `${GITHUB}/bailamos`,
    featured: false,
  },
  {
    name: 'galaxy',
    kind: '3D',
    description:
      'Simulation d’une galaxie en Three.js — premiers pas en 3D : scène, textures, animations.',
    tags: ['Three.js', 'JavaScript'],
    githubUrl: `${GITHUB}/galaxy`,
    featured: false,
  },
  {
    name: 'sigmajack',
    kind: 'Jeu',
    description:
      'Blackjack interactif en JavaScript pur : logique de jeu complète et interface responsive.',
    tags: ['JavaScript', 'Jeu'],
    githubUrl: `${GITHUB}/sigmajack`,
    featured: false,
  },
  {
    name: 'neatify',
    kind: 'CLI',
    description:
      'CLI Java qui organise un dossier : classement des fichiers par catégorie (Documents, Images, Vidéos…) selon leur extension.',
    tags: ['Java', 'CLI'],
    githubUrl: `${GITHUB}/neatify`,
    featured: false,
  },
  {
    name: 'shell-js',
    kind: 'Systèmes',
    description: 'Shell implémenté en Node.js, avec autocomplétion.',
    tags: ['JavaScript', 'Node.js'],
    githubUrl: `${GITHUB}/shell-js`,
    featured: false,
  },
];

export const FEATURED_PROJECTS = PROJECTS.filter((p) => p.featured);
export const OTHER_PROJECTS = PROJECTS.filter((p) => !p.featured);
