import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { badRequest } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/** Flattens Zod issues into the field-keyed shape the Angular forms expect. */
export function fieldErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

/**
 * Replaces the raw request section with the parsed result, so handlers work
 * with coerced, trusted values rather than whatever arrived on the wire.
 */
export const validate =
  <T>(schema: ZodType<T>, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(badRequest('Some of those details need fixing.', fieldErrors(result.error)));
      return;
    }

    if (source === 'body') {
      req.body = result.data;
    } else {
      // req.query and req.params are getter-only in Express 5.
      Object.defineProperty(req, source, { value: result.data, configurable: true });
    }
    next();
  };
