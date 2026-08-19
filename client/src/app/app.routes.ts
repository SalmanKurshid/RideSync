import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · RideSync',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Create account · RideSync',
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · RideSync',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'bikes',
        title: 'Garage · RideSync',
        loadComponent: () => import('./features/bikes/bike-list').then((m) => m.BikeList),
      },
      {
        path: 'bikes/new',
        title: 'Add a bike · RideSync',
        loadComponent: () => import('./features/bikes/bike-form').then((m) => m.BikeForm),
      },
      {
        path: 'bikes/:bikeId/edit',
        title: 'Edit bike · RideSync',
        loadComponent: () => import('./features/bikes/bike-form').then((m) => m.BikeForm),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
