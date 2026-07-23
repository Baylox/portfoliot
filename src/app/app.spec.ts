import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { routes } from './app.routes';
import { Home } from './pages/home';
import { PROFILE } from './data/profile.data';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('affiche le nom du profil dans le hero', async () => {
    const harness = await RouterTestingHarness.create('/');
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(PROFILE.name);
  });

  it('affiche les cinq sections principales', async () => {
    const harness = await RouterTestingHarness.create('/');
    const host = harness.routeNativeElement as HTMLElement;
    for (const id of ['a-propos', 'competences', 'parcours', 'projets', 'contact']) {
      expect(host.querySelector(`#${id}`)).not.toBeNull();
    }
  });
});
