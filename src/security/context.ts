import { AsyncLocalStorage } from 'node:async_hooks';

import type { AuthContext, Scope } from './types.js';

export class SecurityContext {
  private readonly storage = new AsyncLocalStorage<AuthContext>();

  run<T>(context: AuthContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  current(): AuthContext {
    const context = this.storage.getStore();
    if (!context) throw new Error('Missing authenticated request context.');
    return context;
  }

  hasScope(scope: Scope): boolean {
    return this.current().scopes.includes(scope);
  }
}
