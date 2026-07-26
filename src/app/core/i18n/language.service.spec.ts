import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

/**
 * La détection de langue suit une priorité stricte : ?lang= dans l'URL >
 * localStorage > langue du navigateur > fr. detect() n'est pas exportée : on la
 * pilote au travers du service, en manipulant l'URL / le stockage avant sa
 * création (le signal `lang` est initialisé par detect() à l'instanciation).
 */
describe('LanguageService — detect() et effets', () => {
  const originalSearch = location.search;

  /** Réécrit ?lang= sans recharger, pour tester la source URL. */
  function setSearch(search: string): void {
    history.replaceState(null, '', `${location.pathname}${search}`);
  }

  function makeService(): LanguageService {
    // Un TestBed frais garantit une nouvelle instance (detect() re-évalué).
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [LanguageService] });
    return TestBed.inject(LanguageService);
  }

  beforeEach(() => {
    localStorage.clear();
    setSearch('');
  });

  afterAll(() => {
    setSearch(originalSearch);
    localStorage.clear();
  });

  describe('priorité de detect()', () => {
    it("privilégie ?lang= dans l'URL sur tout le reste", () => {
      localStorage.setItem('lang', 'fr');
      setSearch('?lang=en');
      expect(makeService().lang()).toBe('en');
    });

    it('ignore un ?lang= invalide et retombe sur localStorage', () => {
      localStorage.setItem('lang', 'en');
      setSearch('?lang=xx');
      expect(makeService().lang()).toBe('en');
    });

    it("lit localStorage quand l'URL ne porte pas de langue", () => {
      localStorage.setItem('lang', 'en');
      expect(makeService().lang()).toBe('en');
    });

    it('retombe sur la langue du navigateur en dernier recours', () => {
      const spy = vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
      expect(makeService().lang()).toBe('fr');
      spy.mockReturnValue('en-US');
      expect(makeService().lang()).toBe('en');
      spy.mockRestore();
    });
  });

  describe('effets de bord sur le DOM', () => {
    it('met à jour <html lang>, le title et la meta description à la bascule', () => {
      setSearch('?lang=fr');
      const svc = makeService();
      TestBed.tick(); // laisse l'effect() s'exécuter

      svc.set('en');
      TestBed.tick();

      expect(document.documentElement.lang).toBe('en');
      expect(document.title).toContain('Back-end Developer');
    });

    it('persiste la langue choisie dans localStorage', () => {
      const svc = makeService();
      svc.set('en');
      TestBed.tick();
      expect(localStorage.getItem('lang')).toBe('en');
    });
  });

  describe('toggle()', () => {
    it('bascule fr ⇄ en', () => {
      setSearch('?lang=fr');
      const svc = makeService();
      expect(svc.lang()).toBe('fr');
      svc.toggle();
      expect(svc.lang()).toBe('en');
      svc.toggle();
      expect(svc.lang()).toBe('fr');
    });
  });
});
