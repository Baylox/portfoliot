import { Routes } from '@angular/router';
import { Home } from './pages/home';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'lab',
    // La page atelier n'est chargée que si on la visite.
    loadComponent: () => import('./pages/lab/lab').then((m) => m.Lab),
  },
  { path: '**', redirectTo: '' },
];
