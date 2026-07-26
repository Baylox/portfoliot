#!/usr/bin/env node
/**
 * Garde-fou CSP : vérifie que chaque script inline de src/index.html est bien
 * autorisé par son empreinte sha256 dans la directive script-src.
 *
 * Pourquoi : la CSP autorise le script d'amorçage de l'accent par son hash,
 * pas par 'unsafe-inline'. Le hash porte sur les octets exacts du script —
 * une retouche, un reflow Prettier ou un checkout en CRLF le désynchronise.
 * Sans garde-fou, la casse est silencieuse au build et ne se voit qu'à
 * l'exécution (script bloqué → flash de couleur + violation en console).
 *
 * Usage : node scripts/check-csp-hash.mjs   (ou npm run csp:check)
 * Sortie : 0 si tout concorde, 1 sinon, avec le hash attendu à recopier.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const FICHIER = 'src/index.html';

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

// 2. Neutralise les commentaires HTML avant toute recherche de <script> : le
//    commentaire qui documente la CSP contient lui-même le mot « <script> »
//    et ferait matcher une regex naïve sur le mauvais bloc.
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

// 6. Hash déclaré qui ne correspond plus à rien : reste d'une ancienne version.
for (const d of declares) {
  if (!calcules.includes(d)) {
    avertissements.push(
      `Hash déclaré inutilisé dans script-src : '${d}' (script supprimé ou modifié ?)`,
    );
  }
}

// 7. Signale un script inline porteur d'attributs qui aurait aussi besoin d'un
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
  `✔ Garde-fou CSP : ${inlines.length} script(s) inline, ${declares.length} hash(es) déclaré(s) — tout concorde.`,
);
