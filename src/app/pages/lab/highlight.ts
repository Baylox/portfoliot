/**
 * Coloration syntaxique minimale, sans dépendance — spécialisée PHP / TS.
 * Une seule passe de tokenisation qui produit du HTML sûr (tout est échappé
 * en entrée, seules nos balises <span class="tok-*"> sont ajoutées). Suffit
 * pour des extraits courts ; ce n'est pas un vrai lexer, et c'est voulu.
 */

const KEYWORDS = new Set([
  // partagés + PHP
  'abstract',
  'and',
  'array',
  'as',
  'break',
  'callable',
  'case',
  'catch',
  'class',
  'clone',
  'const',
  'continue',
  'declare',
  'default',
  'do',
  'echo',
  'else',
  'elseif',
  'enum',
  'extends',
  'final',
  'finally',
  'fn',
  'for',
  'foreach',
  'function',
  'global',
  'if',
  'implements',
  'instanceof',
  'insteadof',
  'interface',
  'match',
  'namespace',
  'new',
  'or',
  'print',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'static',
  'switch',
  'throw',
  'trait',
  'try',
  'use',
  'while',
  'yield',
  'void',
  'int',
  'string',
  'bool',
  'float',
  'null',
  'true',
  'false',
  'self',
  'parent',
  // TS en plus
  'import',
  'export',
  'from',
  'let',
  'var',
  'async',
  'await',
  'type',
  'number',
  'boolean',
  'undefined',
  'this',
  'typeof',
  'keyof',
]);

/** Échappe le HTML avant toute insertion. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const span = (cls: string, text: string) => `<span class="${cls}">${esc(text)}</span>`;

// Ordre = priorité. Chaque motif capture un token entier ; le reste part brut.
const RULES: { cls: string; re: RegExp }[] = [
  { cls: 'tok-comment', re: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^[\n][^\n]*)/ },
  { cls: 'tok-attr', re: /^#\[[^\]]*\]/ }, // attributs PHP #[Route(...)]
  { cls: 'tok-string', re: /^(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
  { cls: 'tok-var', re: /^\$[A-Za-z_]\w*/ }, // variables PHP
  { cls: 'tok-annot', re: /^@[A-Za-z_]\w*/ }, // @throws, @return dans les docblocks
  { cls: 'tok-class', re: /^[A-Z][A-Za-z0-9_]*/ }, // types / classes
  { cls: 'tok-num', re: /^\d[\w.]*/ },
];

const IDENT = /^[A-Za-z_\\][\w\\]*/; // mots (avec backslash pour les FQCN PHP)

export function highlight(code: string): string {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const rest = code.slice(i);
    let matched = false;

    for (const { cls, re } of RULES) {
      const m = re.exec(rest);
      if (m) {
        out += span(cls, m[0]);
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (matched) {
      continue;
    }

    const id = IDENT.exec(rest);
    if (id) {
      const word = id[0];
      out += KEYWORDS.has(word) ? span('tok-kw', word) : esc(word);
      i += word.length;
      continue;
    }

    out += esc(rest[0]);
    i += 1;
  }
  return out;
}
