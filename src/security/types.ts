export type Scope = 'inventory:read' | 'restock:draft';

export type AuthContext = {
  subject: string;
  scopes: Scope[];
};

export type TokenRecord = AuthContext & {
  token: string;
};
