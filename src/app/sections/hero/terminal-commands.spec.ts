import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Terminal } from './terminal';

/**
 * Le routage des commandes du terminal : un mot connu appelle son handler, un
 * mot inconnu produit une erreur « command not found », la casse est ignorée,
 * et quelques commandes pures (clear, history) se comportent comme attendu.
 * On pilote l'input réel et on lit les lignes rendues, sans toucher au moteur
 * audio (inerte sous jsdom, faute d'AudioContext).
 */
describe('Terminal — routage des commandes', () => {
  let fixture: ComponentFixture<Terminal>;
  let component: Terminal;

  /** Texte concaténé de toutes les lignes actuellement affichées. */
  function outputText(): string {
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** Tape une commande dans l'input et déclenche Enter, comme un vrai usage. */
  function run(cmd: string): void {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = cmd;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Terminal] }).compileComponents();
    fixture = TestBed.createComponent(Terminal);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Le terminal démarre par une séquence de boot temporisée ; on force l'état
    // « prêt » pour tester le routage sans attendre les setTimeout d'amorçage.
    (component as unknown as { booted: { set(v: boolean): void } }).booted.set(true);
    fixture.detectChanges();
  });

  it('affiche le résultat de `whoami` (commande connue)', () => {
    run('whoami');
    expect(outputText()).toContain('Joris');
  });

  it('émet une erreur pour une commande inconnue', () => {
    run('inexistante');
    // notFound() reprend le nom saisi ; l'indice « help » l'accompagne.
    const text = outputText();
    expect(text).toContain('inexistante');
    expect(text.toLowerCase()).toContain('help');
  });

  it('ignore la casse du nom de commande', () => {
    run('WHOAMI');
    expect(outputText()).toContain('Joris');
  });

  it('`clear` vide la sortie', () => {
    run('whoami');
    expect(outputText()).toContain('Joris');
    run('clear');
    const text = outputText();
    expect(text).not.toContain('Joris');
  });

  it('`history` liste les commandes précédentes', () => {
    run('whoami');
    run('ls');
    run('history');
    const text = outputText();
    // Les deux commandes tapées avant `history` doivent y figurer numérotées.
    expect(text).toContain('whoami');
    expect(text).toContain('ls');
  });

  it('une saisie vide ne produit aucune erreur', () => {
    const before = outputText();
    run('');
    const after = outputText();
    expect(after.toLowerCase()).not.toContain('not found');
    expect(after.length).toBeGreaterThanOrEqual(before.length);
  });

  it('`help` liste les commandes disponibles', () => {
    run('help');
    const text = outputText();
    expect(text).toContain('whoami');
    expect(text).toContain('projects');
  });
});
