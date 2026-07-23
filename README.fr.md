<div align="center">

<pre>
     ██╗██████╗
     ██║██╔══██╗
     ██║██║  ██║
██   ██║██║  ██║
╚█████╔╝██████╔╝
 ╚════╝ ╚═════╝
</pre>

<h1>baylox-sh — portfolio de Joris Dupont-Alamo</h1>

<p><code>// transmission entrante — canal sécurisé</code></p>

<p><strong><a href="https://baylox.github.io/portfoliot/">baylox.github.io/portfoliot</a></strong></p>

<p><a href="README.md">English version</a></p>

<p>
<a href="https://angular.dev"><img alt="Angular 21" src="https://img.shields.io/badge/Angular-21-00e5ff?logo=angular&logoColor=white&labelColor=020409"></a>
<a href="https://www.typescriptlang.org/"><img alt="TypeScript 5.9" src="https://img.shields.io/badge/TypeScript-5.9-00e5ff?logo=typescript&logoColor=white&labelColor=020409"></a>
<a href="https://vitest.dev"><img alt="Tests Vitest" src="https://img.shields.io/badge/Tests-Vitest-00e5ff?logo=vitest&logoColor=white&labelColor=020409"></a>
<a href="https://github.com/Baylox/portfoliot/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Baylox/portfoliot/deploy.yml?label=CI&logo=githubactions&logoColor=white&labelColor=020409&color=00e5ff"></a>
</p>

</div>

> Un portfolio qui se visite comme on monte à bord d'une machine : grille en
> perspective, icosaèdre 3D en fil de fer, traceurs néon qui tracent leurs murs
> de lumière, un vrai shell — et une électro générée note par note en Web
> Audio. Zéro asset, zéro sample, zéro lib graphique ou audio : tout est
> calculé à l'exécution.

![Aperçu du portfolio — circuit cyan](docs/preview.png)

## 01 — Ce qui sort de l'ordinaire

- **Fond animé en Canvas 2D** — grille en perspective, horizon lumineux, ciel
  étoilé, un **icosaèdre 3D en fil de fer** (matrices de rotation maison, pas
  de Three.js) et des traceurs néon qui tracent de vrais murs de lumière à
  angles droits, chacun dans son territoire. Le sol vous sent passer : les
  dalles de la grille s'illuminent sous votre curseur et s'éteignent en
  glissant.
- **Un vrai terminal** — historique (`↑`/`↓`), autocomplétion (`Tab`),
  `Ctrl+L`, et une quinzaine de commandes qui racontent le profil.
- **Électro générative, live-codable** — un séquenceur maison (lookahead sur
  l'horloge audio, horloge dans un Worker) joue kick, clap, basse-riff, arpège
  et stabs, décrits dans une **mini-notation inspirée de Strudel** testée.
  Sidechain, réverb à réponse impulsionnelle générée, délai ping-pong — aucun
  fichier audio. Chargée en lazy (~4 ko gzip), à lancer depuis le header ou la
  commande `synth`, et le fond pulse avec le kick. Le meilleur : la commande
  `score` **remplace n'importe quel pattern pendant que la musique joue** —
  hommage à [Strudel](https://strudel.cc), l'environnement de live-coding avec
  lequel Joris compose pour le plaisir. Plutôt clic que clavier ? `pads`
  ouvre un séquenceur graphique — même moteur, tête de lecture calée sur
  l'horloge audio. Et votre beat repart avec vous : `rec` le rend en .wav
  téléchargeable — hors-ligne, dans votre navigateur, plus vite que le
  temps réel.
- **Deux circuits néon** — `neon` bascule toute l'interface entre cyan et
  orange. Persisté en `localStorage`, partageable via
  [`?accent=orange`](https://baylox.github.io/portfoliot/?accent=orange).
- **Soigné jusqu'au bout** — scanlines CRT, panneaux HUD aux coins lumineux,
  polices auto-hébergées, `prefers-reduced-motion` respecté, `role="log"` sur
  le terminal, 100 % responsive.

<details>
<summary><code>neon</code> — voir le contre-circuit orange</summary>

![Aperçu du portfolio — contre-circuit orange](docs/preview-orange.png)

</details>

## 02 — baylox-sh

```console
joris@baylox:~$ help
Commandes disponibles :
  help       liste des commandes
  whoami     qui suis-je ?
  ls         liste les fichiers
  cat        affiche un fichier (cat about.txt)
  skills     compétences par domaine
  projects   projets (--all pour tout)
  contact    me joindre
  github     ouvre mon profil GitHub
  neofetch   infos système
  neon       bascule le néon cyan ⇄ orange
  synth      ambiance sonore générative on/off
  vu         vu-mètre du synthé
  score      live-coding : remplace un pattern
  pads       séquenceur graphique
  radio      change de station
  rec        exporte votre beat en .wav
  overdrive  ???
  history    historique des commandes
  clear      efface le terminal
  rm         supprime des fichiers
  sudo       droits administrateur
Astuce : Tab pour compléter, ↑/↓ pour l'historique.
```

`sudo hire-me` accorde les permissions.

## 03 — Démarrage

```bash
npm install
npm start        # http://localhost:4200
npm test         # tests unitaires (Vitest)
npm run build    # build de production
```

Chaque push sur `main` déclenche la CI (tests + build) et déploie sur
GitHub Pages.

## 04 — Architecture

```
src/app/
├── core/                     # moteur du site
│   ├── neon-background/      # canvas : grille, icosaèdre 3D, murs de lumière
│   ├── ambient/              # séquenceur électro : notation, partition, moteur
│   ├── ambient-audio.service # façade du synthé (chunk lazy, AudioContext au clic)
│   ├── theme.service.ts      # néon cyan/orange (signals + localStorage)
│   ├── grid-fx.service.ts    # canal terminal → fond animé
│   ├── reveal.directive.ts   # apparition au scroll (IntersectionObserver)
│   └── icon.ts               # icônes SVG inline
├── layout/                   # header (scroll-spy) & footer
├── sections/                 # hero + terminal, à propos, compétences, parcours, projets, contact
└── data/                     # profil, compétences, parcours, projets — tout le contenu au même endroit
```

Angular 21 en mode **zoneless**, composants standalone, signals partout,
`OnPush` par défaut. Le contenu (profil, projets, compétences) est isolé dans
`src/app/data/` : modifier le portfolio ne demande jamais de toucher aux
composants.

## 05 — Contact

- GitHub — [@Baylox](https://github.com/Baylox)
- LinkedIn — [Joris Dupont-Alamo](https://www.linkedin.com/in/joris-dupont-alamo/)
- Email — jdupontalamo@gmail.com

---

<p align="center"><code>// fin de transmission_</code></p>
