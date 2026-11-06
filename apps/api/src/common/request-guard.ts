import type { NextFunction, Request, Response } from 'express';

/**
 * Rejects requests the API cannot interpret instead of letting them reach the database layer as a 500:
 * a query parameter repeated (?q=a&q=b) arrives as an array, and a NUL byte in the URL cannot be stored in Postgres.
 */
export function requestGuard(req: Request, res: Response, next: NextFunction) {
  const repeated = Object.entries(req.query).find(([, value]) => typeof value !== 'string');
  if (repeated) {
    return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: `Query parameter "${repeated[0]}" may only be given once` });
  }
  if (/%00/i.test(req.originalUrl) || req.originalUrl.includes('\u0000')) {
    return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'The URL contains an invalid character' });
  }
  next();
}
