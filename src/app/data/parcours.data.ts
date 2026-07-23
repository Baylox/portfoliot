export interface ParcoursStep {
  periode: string;
  titre: string;
  lieu: string;
  detail: string;
  type: 'experience' | 'formation';
}

/** Du plus récent au plus ancien — la timeline se lit de haut en bas. */
export const PARCOURS: ParcoursStep[] = [
  {
    periode: 'depuis sept. 2025',
    titre: 'Développeur back-end Symfony — alternance',
    lieu: 'Ministère de l’Intérieur, Lyon',
    detail: 'Conception et évolution d’une application métier, du modèle de domaine à l’interface.',
    type: 'experience',
  },
  {
    periode: '2025 — 2026',
    titre: 'Concepteur développeur d’applications — RNCP niveau 6 (Bac+3)',
    lieu: 'Dawan — en alternance',
    detail: 'Titre en cours de préparation.',
    type: 'formation',
  },
  {
    periode: '2023 — 2025',
    titre: 'Développeur Web & Mobile — RNCP niveau 5 (Bac+2)',
    lieu: 'Studi, Lyon',
    detail: 'Spécialisation développement back-end et mobile.',
    type: 'formation',
  },
];
