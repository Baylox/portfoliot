import { highlight } from './highlight';

/**
 * highlight() produit du HTML inséré tel quel dans le DOM (innerHTML côté lab).
 * La garantie de sécurité — tout le texte source est échappé, seules nos balises
 * <span class="tok-*"> sont ajoutées — doit donc être blindée par des tests.
 */
describe('highlight', () => {
  /** Retire nos <span class="tok-*"> pour ne garder que le texte réellement émis. */
  const stripSpans = (html: string) => html.replace(/<span class="tok-[a-z]+">|<\/span>/g, '');

  describe('sécurité — échappement HTML', () => {
    it('échappe une balise <script> injectée dans le code source', () => {
      const out = highlight('<script>alert(1)</script>');
      // Aucune vraie balise script ne doit survivre.
      expect(out).not.toContain('<script>');
      expect(out).not.toContain('</script>');
      expect(out).toContain('&lt;script&gt;');
      expect(out).toContain('&lt;/script&gt;');
    });

    it('échappe les esperluettes et les chevrons isolés', () => {
      expect(highlight('a & b')).toContain('&amp;');
      expect(highlight('x > y')).toContain('&gt;');
      expect(highlight('x < y')).toContain('&lt;');
    });

    it("n'émet que des <span> class=tok-* comme seules balises", () => {
      const out = highlight('<img src=x onerror="alert(1)">');
      // Après retrait de nos spans, il ne reste plus aucun '<' non échappé :
      // les chevrons de la balise injectée sont neutralisés, donc le DOM ne
      // verra jamais un vrai <img> exécutable (peu importe l'attribut onerror,
      // inerte tant qu'il reste dans du texte et non dans une balise réelle).
      const bare = stripSpans(out);
      expect(bare).not.toMatch(/<(?!\/?span)/);
      expect(out).not.toContain('<img');
      expect(out).toContain('&lt;img');
    });

    it('échappe un guillemet fermant qui tenterait de casser un attribut', () => {
      // Une chaîne PHP contenant "><script> ne doit pas produire de vraie balise.
      const out = highlight(`$x = "><script>";`);
      expect(out).not.toContain('<script>');
      expect(out).toContain('&lt;script&gt;');
    });
  });

  describe('tokenisation', () => {
    it('colore les mots-clés partagés PHP/TS', () => {
      const out = highlight('function foo');
      expect(out).toContain('<span class="tok-kw">function</span>');
    });

    it('laisse les identifiants non mot-clé en texte brut échappé', () => {
      const out = highlight('foo');
      expect(out).toBe('foo');
    });

    it('colore les variables PHP $var', () => {
      expect(highlight('$name')).toContain('<span class="tok-var">$name</span>');
    });

    it('colore les chaînes entre guillemets sans exécuter leur contenu', () => {
      const out = highlight('"hello"');
      expect(out).toContain('<span class="tok-string">');
      expect(out).toContain('hello');
    });

    it('colore les commentaires ligne et bloc', () => {
      expect(highlight('// note')).toContain('<span class="tok-comment">');
      expect(highlight('/* bloc */')).toContain('<span class="tok-comment">');
    });

    it('colore un attribut PHP #[Route(...)]', () => {
      expect(highlight('#[Route]')).toContain('<span class="tok-attr">');
    });

    it('colore une classe / un type commençant par une majuscule', () => {
      expect(highlight('User')).toContain('<span class="tok-class">User</span>');
    });

    it('colore les nombres', () => {
      expect(highlight('42')).toContain('<span class="tok-num">42</span>');
    });
  });

  describe('robustesse', () => {
    it('retourne une chaîne vide pour une entrée vide', () => {
      expect(highlight('')).toBe('');
    });

    it("ne boucle pas et n'échoue pas sur une chaîne non fermée", () => {
      // Chaîne ouverte sans guillemet fermant : ne doit pas jeter ni figer.
      expect(() => highlight('"pas fermé')).not.toThrow();
      const out = highlight('"pas fermé');
      expect(out).toContain('pas');
    });

    it('préserve le texte complet après retrait de nos balises', () => {
      const source = 'public function getName(): string { return $this->name; }';
      const bare = stripSpans(highlight(source));
      // Le décodage des entités doit redonner exactement la source.
      const decoded = bare.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      expect(decoded).toBe(source);
    });
  });
});
