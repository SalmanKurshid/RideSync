import type { ApiErrorCode } from '@ridesync/shared';

/**
 * The only error type route code should throw. Everything else reaching the
 * error handler is treated as an unexpected failure and reported as INTERNAL
 * with nothing leaked to the client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: Record<string, string[]> | undefined;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: Record<string, string[]>) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const unauthenticated = (message = 'You need to sign in to do that.') =>
  new AppError(401, 'UNAUTHENTICATED', message);

/**
 * Used both for genuinely missing rows and for rows owned by somebody else.
 * Returning 403 for the latter would confirm that another rider's trip exists.
 */
export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`);

export const conflict = (message: string, details?: Record<string, string[]>) =>
  new AppError(409, 'CONFLICT', message, details);

export const businessRule = (message: string, details?: Record<string, string[]>) =>
  new AppError(422, 'BUSINESS_RULE', message, details);
