import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '@ridesync/shared';
import { isProduction, isTest } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { fieldErrors } from './validate.js';

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiError = {
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}.` },
  };
  res.status(404).json(body);
}

/**
 * body-parser rejects unreadable requests before any route runs. Those are the
 * client's mistake, not ours, so they must not be reported as a server fault.
 */
function fromBodyParser(error: unknown): AppError | null {
  if (typeof error !== 'object' || error === null || !('type' in error)) return null;

  switch ((error as { type?: string }).type) {
    case 'entity.parse.failed':
      return new AppError(400, 'VALIDATION_ERROR', 'That request body is not valid JSON.');
    case 'entity.too.large':
      return new AppError(400, 'VALIDATION_ERROR', 'That request body is too large.');
    case 'encoding.unsupported':
      return new AppError(400, 'VALIDATION_ERROR', 'That content encoding is not supported.');
    default:
      return null;
  }
}

/** Prisma surfaces constraint violations as coded errors; translate the ones we expect. */
function fromPrisma(error: { code?: string; meta?: Record<string, unknown> }): AppError | null {
  const target = Array.isArray(error.meta?.['target'])
    ? (error.meta['target'] as string[]).join(', ')
    : String(error.meta?.['target'] ?? '');

  switch (error.code) {
    case 'P2002':
      return new AppError(409, 'CONFLICT', `That ${target || 'value'} is already taken.`);
    case 'P2003':
      return new AppError(409, 'CONFLICT', 'Another record still depends on this one.');
    case 'P2025':
      return new AppError(404, 'NOT_FOUND', 'Resource not found.');
    default:
      return null;
  }
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  let appError: AppError | null = error instanceof AppError ? error : null;

  if (!appError && error instanceof ZodError) {
    appError = new AppError(
      400,
      'VALIDATION_ERROR',
      'Some of those details need fixing.',
      fieldErrors(error),
    );
  }

  if (!appError) {
    appError = fromBodyParser(error);
  }

  if (!appError && typeof error === 'object' && error !== null && 'code' in error) {
    appError = fromPrisma(error as { code?: string; meta?: Record<string, unknown> });
  }

  if (!appError) {
    // Unexpected: log it in full, tell the client nothing about the internals.
    if (!isTest) {
      console.error('[unhandled]', error);
    }
    appError = new AppError(500, 'INTERNAL', 'Something went wrong on our side.');
  }

  const body: ApiError = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };

  if (!isProduction && appError.status >= 500 && error instanceof Error) {
    Object.assign(body.error, { stack: error.stack });
  }

  res.status(appError.status).json(body);
}
