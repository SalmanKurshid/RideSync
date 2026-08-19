import { inject } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import type { ApiError } from '@ridesync/shared';
import { ToastService } from '../services/toast.service';

/**
 * Turns API failures into something a rider can read.
 *
 * Validation errors are deliberately left alone: those belong beside the field
 * that caused them, and the form maps them itself.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const body = error.error as Partial<ApiError> | null;
        const code = body?.error?.code;

        if (error.status === 0) {
          toast.error('Cannot reach the server. Check your connection.');
        } else if (code && code !== 'VALIDATION_ERROR' && code !== 'UNAUTHENTICATED') {
          toast.error(body?.error?.message ?? 'Something went wrong.');
        } else if (!code && error.status >= 500) {
          toast.error('Something went wrong on our side.');
        }
      }

      return throwError(() => error);
    }),
  );
};
