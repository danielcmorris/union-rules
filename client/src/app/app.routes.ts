import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'timesheets',
    canActivate: [authGuard],
    loadComponent: () => import('./features/timesheets/timesheets.component').then(m => m.TimesheetsComponent)
  },
  {
    path: 'timesheets/:id/review',
    canActivate: [authGuard],
    loadComponent: () => import('./features/estimate/estimate.component').then(m => m.EstimateComponent)
  },
  {
    path: 'timesheets/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calculator/calculator.component').then(m => m.CalculatorComponent)
  },
  {
    path: 'estimate',
    canActivate: [authGuard],
    loadComponent: () => import('./features/estimate/estimate.component').then(m => m.EstimateComponent)
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
  {
    path: 'about',
    canActivate: [authGuard],
    loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent)
  },
  { path: '', redirectTo: 'timesheets', pathMatch: 'full' },
  { path: 'calculator', redirectTo: 'timesheets', pathMatch: 'full' },
  { path: '**', redirectTo: 'timesheets' }
];
