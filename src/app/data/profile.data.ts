export interface SocialLink {
  label: string;
  url: string;
  icon: 'github' | 'linkedin' | 'mail';
}

export const PROFILE = {
  // Le gluon de mots (U+2060) interdit la césure après le tiret : le nom se
  // coupe « Joris / Dupont-Alamo », jamais avec un tiret orphelin.
  name: 'Joris Dupont-⁠Alamo',
  alias: 'baylox',
  role: 'Développeur Back-end',
  headline: 'Backend first, produit toujours.',
  tagline:
    "Je conçois des applications robustes et maintenables avec Symfony, Spring Boot et NestJS. Cap sur l'architecture logicielle : Clean Architecture, DDD, principes SOLID.",
  // Assemblée à l'exécution : le bundle ne contient jamais « xxx@yyy », les
  // moissonneurs d'adresses repartent bredouilles.
  email: ['jdupontalamo', 'gmail.com'].join('@'),
  githubUrl: 'https://github.com/Baylox',
  linkedinUrl: 'https://www.linkedin.com/in/joris-dupont-alamo/',
  about: [
    `Développeur back-end, je construis des systèmes pensés pour durer :
     domaines bien découpés, API claires, code testé. Symfony est mon socle
     quotidien ; Spring Boot et NestJS, mes terrains d'exploration.`,
    `Mon cap : l'architecture logicielle. Transformer un besoin flou en une
     structure lisible — Clean Architecture, DDD, SOLID — non par dogme, mais
     parce qu'un code bien structuré évolue sans crainte de régression.`,
    `En parallèle, une trentaine de projets open source me servent de
     laboratoire : outillage IA, systèmes distribués… et la musique codée.
     Je compose avec Strudel, et c'est cette pratique qui a fait naître le
     séquenceur live-codable caché quelque part sur cette page.`,
  ],
} as const;

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'GitHub', url: PROFILE.githubUrl, icon: 'github' },
  { label: 'LinkedIn', url: PROFILE.linkedinUrl, icon: 'linkedin' },
  { label: 'Email', url: `mailto:${PROFILE.email}`, icon: 'mail' },
];
