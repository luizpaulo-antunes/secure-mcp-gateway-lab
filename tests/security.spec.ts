import { describe, expect, it } from 'vitest';

import { redact } from '../src/security/audit.js';
import { TokenAuthorizer } from '../src/security/auth.js';
import { FixedWindowRateLimiter } from '../src/security/rate-limiter.js';

describe('security controls', () => {
  it('authorizes a token without exposing it in the resulting context', () => {
    const authorizer = new TokenAuthorizer([
      { token: 'synthetic-reader-token', subject: 'reader', scopes: ['inventory:read'] }
    ]);

    expect(authorizer.authorize('synthetic-reader-token')).toEqual({
      subject: 'reader',
      scopes: ['inventory:read']
    });
    expect(authorizer.authorize('wrong-token')).toBeUndefined();
  });

  it('redacts secrets and personal fields in structured audit details', () => {
    expect(redact({ authorization: 'Bearer secret', nested: { email: 'person@example.com' }, sku: 'SKU-1001' }))
      .toEqual({ authorization: '[REDACTED]', nested: { email: '[REDACTED]' }, sku: 'SKU-1001' });
  });

  it('constructs a deterministic rate limiter for middleware use', () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000, () => 100);
    expect(limiter.middleware()).toBeTypeOf('function');
  });
});
