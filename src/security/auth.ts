import { createHash, timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

import type { AuthContext, TokenRecord } from './types.js';

type StoredToken = AuthContext & { digest: Buffer };

export class TokenAuthorizer {
  private readonly records: StoredToken[];

  constructor(records: TokenRecord[]) {
    this.records = records.map(({ token, ...context }) => ({
      ...context,
      digest: digest(token)
    }));
  }

  authorize(token: string): AuthContext | undefined {
    const candidate = digest(token);
    const match = this.records.find((record) => timingSafeEqual(record.digest, candidate));
    return match ? { subject: match.subject, scopes: [...match.scopes] } : undefined;
  }
}

export function bearerAuthentication(authorizer: TokenAuthorizer): RequestHandler {
  return (request, response, next) => {
    const authorization = request.header('authorization');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const context = token ? authorizer.authorize(token) : undefined;

    if (!context) {
      response.setHeader('WWW-Authenticate', 'Bearer');
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    response.locals.auth = context;
    next();
  };
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
