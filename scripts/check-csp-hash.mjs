#!/usr/bin/env node
/**
 * Garde-fou CSP : vérifie qu'une page est réellement compatible avec sa propre
 * Content-Security-Policy — scripts inline autorisés par empreinte sha256, et
 * absence de gestionnaire d'événement inline.
 *
 * Pourquoi : la CSP autorise le script d'amorçage de l'accent par son hash,
 * pas par 'unsafe-inline'. Le hash porte sur les octets exacts du script —
 * une retouche, un reflow Prettier ou un checkout en CRLF le désynchronise.
 * Sans garde-fou, la casse est silencieuse au build et ne se voit qu'à
 * l'exécution (script bloqué → flash de couleur + violation en console).
 *
 * À vérifier sur DEUX fichiers, car le build réécrit la page :
 *   node scripts/check-csp-hash.mjs                                 (source)
 *   node scripts/check-csp-hash.mjs dist/portfolio/browser/index.html (artefact)
 * Ne valider que la source est un angle mort : c'est ainsi qu'un
 * onload="this.media='all'" généré par l'optimisation inlineCritical d'Angular
 * a failli partir en production, où il aurait laissé la page sans styles.
 *
 * Sortie : 0 si tout concorde, 1 sinon, avec le hash attendu à recopier.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const FICHIER = process.argv[2] ?? 'src/index.html';

/** Hash tel que l'attend une CSP : sha256 des octets UTF-8, en base64. */
function empreinte(contenu) {
  return 'sha256-' + createHash('sha256').update(contenu, 'utf8').digest('base64');
}

const erreurs = [];
const avertissements = [];

// Lecture brute : pas de normalisation des fins de ligne, ce sont les octets
// exacts qui comptent (readFileSync utf8 ne les traduit pas, contrairement au
// mode « universal newlines » de certains langages).
const html = readFileSync(FICHIER, 'utf8');

// 1. Les CRLF cassent le hash. C'est le mode de défaillance le plus sournois :
//    aucun changement de code visible. .gitattributes (eol=lf) doit l'empêcher.
if (html.includes('\r\n')) {
  erreurs.push(
    `${FICHIER} contient des fins de ligne CRLF. Le hash de la CSP est calculé\n` +
      `  sur des octets en LF : le script inline sera bloqué par le navigateur.\n` +
      `  Vérifier que .gitattributes impose « * text=auto eol=lf », puis renormaliser :\n` +
      `    git add --renormalize . && git status`,
  );
}

// 2. Neutralise les commentaires HTML avant TOUTE recherche de balise. Un
//    commentaire qui documente la CSP finit toujours par citer des noms de
//    balises ou d'attributs ; sans ce filtrage, l'analyse se piège elle-même.
const sansCommentaires = html.replace(/<!--[\s\S]*?-->/g, '');

// 3. Scripts inline exécutables = balise <script> sans aucun attribut.
//    Exclut de fait <script src="…"> et <script type="application/ld+json">
//    (les données structurées ne sont pas soumises à script-src).
const inlines = [...sansCommentaires.matchAll(/<script\s*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

// 4. Hashes déclarés dans la directive script-src de la meta CSP.
const metaCsp = sansCommentaires.match(
  /<meta\s+http-equiv=["']Content-Security-Policy["'][\s\S]*?content=["']([\s\S]*?)["']\s*\/?>/i,
);
if (!metaCsp) {
  erreurs.push(`Aucune <meta http-equiv="Content-Security-Policy"> trouvée dans ${FICHIER}.`);
}
const scriptSrc = metaCsp
  ? (metaCsp[1].split(';').find((d) => d.trim().startsWith('script-src')) ?? '')
  : '';
const declares = [...scriptSrc.matchAll(/'(sha256-[A-Za-z0-9+/=]+)'/g)].map((m) => m[1]);

// 5. Chaque script inline doit être couvert par un hash déclaré.
const calcules = inlines.map(empreinte);
inlines.forEach((contenu, i) => {
  if (!declares.includes(calcules[i])) {
    const apercu = contenu.trim().split('\n')[0].slice(0, 60);
    erreurs.push(
      `Script inline non autorisé par la CSP (« ${apercu}… »).\n` +
        `  Attendu dans script-src : '${calcules[i]}'\n` +
        `  Déclaré(s) actuellement : ${declares.length ? declares.map((d) => `'${d}'`).join(', ') : '(aucun)'}`,
    );
  }
});

// 6. Gestionnaires d'événements inline : un hash ne les couvre PAS. Sous une
//    script-src sans 'unsafe-inline' ni 'unsafe-hashes', ils sont bloqués.
//    C'est le piège qui a failli passer : l'optimisation inlineCritical
//    d'Angular génère un onload qui active la feuille de style principale ;
//    bloqué, la page s'affiche sans styles en production.
const toleranceInline =
  scriptSrc.includes("'unsafe-inline'") || scriptSrc.includes("'unsafe-hashes'");
if (!toleranceInline) {
  for (const m of sansCommentaires.matchAll(/\son([a-z]+)\s*=\s*["'][^"']*["']/gi)) {
    erreurs.push(
      `Gestionnaire d'événement inline « ${m[0].trim().slice(0, 60)} » dans ${FICHIER}.\n` +
        `  script-src l'autorise par hash uniquement avec 'unsafe-hashes' — il sera bloqué.\n` +
        `  Si c'est un onload de feuille de style, c'est l'optimisation inlineCritical\n` +
        `  d'Angular : la désactiver dans angular.json (optimization.styles.inlineCritical).`,
    );
  }
}

// 7. Hash déclaré qui ne correspond plus à rien : reste d'une ancienne version.
for (const d of declares) {
  if (!calcules.includes(d)) {
    avertissements.push(
      `Hash déclaré inutilisé dans script-src : '${d}' (script supprimé ou modifié ?)`,
    );
  }
}

// 8. Signale un script inline porteur d'attributs qui aurait aussi besoin d'un
//    hash (type="module" par exemple) — ld+json et src="…" sont légitimes.
for (const [, attrs] of sansCommentaires.matchAll(/<script\s+([^>]*)>/g)) {
  const a = attrs.toLowerCase();
  if (!a.includes('src=') && !a.includes('application/ld+json')) {
    avertissements.push(
      `Script inline avec attributs non reconnu (« <script ${attrs.trim().slice(0, 50)}> ») :\n` +
        `  vérifier s'il doit lui aussi être autorisé par un hash.`,
    );
  }
}

for (const a of avertissements) {
  console.warn(`⚠ ${a}`);
}

if (erreurs.length > 0) {
  console.error(`\n✖ Garde-fou CSP : ${erreurs.length} problème(s) dans ${FICHIER}\n`);
  for (const e of erreurs) {
    console.error(`  • ${e}\n`);
  }
  process.exit(1);
}

console.log(
  `✔ Garde-fou CSP (${FICHIER}) : ${inlines.length} script(s) inline, ` +
    `${declares.length} hash(es) déclaré(s), aucun gestionnaire inline — tout concorde.`,
);
