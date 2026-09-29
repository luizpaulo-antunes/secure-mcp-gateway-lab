import type { RequestHandler } from 'express';

import type { AuthContext } from './types.js';

type Bucket = { count: number; resetAt: number };

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now
  ) {}

  middleware(): RequestHandler {
    return (_request, response, next) => {
      const context = response.locals.auth as AuthContext;
      const timestamp = this.now();
      const existing = this.buckets.get(context.subject);
      const bucket = !existing || timestamp >= existing.resetAt
        ? { count: 0, resetAt: timestamp + this.windowMs }
        : existing;

      bucket.count += 1;
      this.buckets.set(context.subject, bucket);
      response.setHeader('X-RateLimit-Limit', this.limit);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, this.limit - bucket.count));

      if (bucket.count > this.limit) {
        response.setHeader('Retry-After', Math.ceil((bucket.resetAt - timestamp) / 1000));
        response.status(429).json({ error: 'rate_limit_exceeded' });
        return;
      }

      next();
    };
  }
}
