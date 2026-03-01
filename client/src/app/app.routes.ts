import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'calculator',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calculator/calculator.component').then(m => m.CalculatorComponent)
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent)
  },
  {
    path: 'docs',
    canActivate: [authGuard],
    loadComponent: () => import('./features/docs/docs.component').then(m => m.DocsComponent)
  },
  { path: '', redirectTo: 'calculator', pathMatch: 'full' },
  { path: '**', redirectTo: 'calculator' }
];
