import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

/**
 * Protects routes that need a rider. On a cold load (typing a URL directly, or
 * refreshing) the store has not resolved yet, so the guard asks the API before
 * deciding rather than bouncing a signed-in rider to the login screen.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  const redirect = () =>
    router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

  if (auth.isResolved()) {
    return auth.isAuthenticated() ? true : redirect();
  }

  return auth.restoreSession().pipe(map((user) => (user ? true : redirect())));
};

/** Keeps a signed-in rider away from the login and register screens. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  const home = () => router.createUrlTree(['/dashboard']);

  if (auth.isResolved()) {
    return auth.isAuthenticated() ? home() : true;
  }

  return auth.restoreSession().pipe(map((user) => (user ? home() : true)));
};
