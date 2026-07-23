export interface SkillGroup {
  title: string;
  icon: 'server' | 'layout' | 'database' | 'compass' | 'shield' | 'check';
  skills: string[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    title: 'Backend',
    icon: 'server',
    skills: ['Symfony', 'Spring Boot', 'NestJS', 'PHP', 'Java', 'Python', 'SQL'],
  },
  {
    title: 'Bases de données & ORM',
    icon: 'database',
    skills: ['PostgreSQL', 'MariaDB / MySQL', 'MongoDB', 'Doctrine', 'Prisma', 'Mongoose'],
  },
  {
    title: 'Architecture & DevOps',
    icon: 'compass',
    skills: [
      'Clean Architecture',
      'DDD',
      'SOLID',
      'Docker',
      'Linux',
      'GitLab CI',
      'GitHub Actions',
    ],
  },
  {
    title: 'Frontend',
    icon: 'layout',
    skills: ['Angular', 'TypeScript', 'Twig', 'Turbo / Stimulus', 'Tailwind CSS'],
  },
  {
    title: 'Qualité & Tests',
    icon: 'check',
    skills: ['PHPUnit', 'PHPStan', 'PHP CS Fixer', 'Foundry'],
  },
];
