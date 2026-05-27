import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'dictionary',
    loadComponent: () => import('./features/dictionary/dictionary.component').then(m => m.DictionaryComponent),
  },
  {
    path: 'dictionary/:term',
    loadComponent: () => import('./features/dictionary/word-detail/word-detail.component').then(m => m.WordDetailComponent),
  },
  {
    path: 'submit',
    canActivate: [authGuard],
    loadComponent: () => import('./features/submit/submit.component').then(m => m.SubmitComponent),
  },
  {
    path: 'pending',
    canActivate: [authGuard, roleGuard(['approver', 'admin'])],
    loadComponent: () => import('./features/pending/pending.component').then(m => m.PendingComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
