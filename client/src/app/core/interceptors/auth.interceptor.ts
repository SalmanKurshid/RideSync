import { inject } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

/**
 * Sends the session cookie with every API call and reacts to it going stale.
 *
 * The `/auth/me` probe is exempt from the redirect: a 401 there is the expected
 * answer for a visitor who is simply not signed in, and bouncing on it would
 * fight the guards.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  const request = req.clone({ withCredentials: true });

  return next(request).pipe(
    catchError((error: unknown) => {
      const isSessionProbe = req.url.endsWith('/auth/me');
      const isAuthCall = req.url.includes('/auth/');

      if (error instanceof HttpErrorResponse && error.status === 401 && !isSessionProbe && !isAuthCall) {
        auth.clear();
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }

      return throwError(() => error);
    }),
  );
};
