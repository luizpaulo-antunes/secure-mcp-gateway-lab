import { createApp } from './app.js';
import { TokenAuthorizer } from './security/auth.js';

const readerToken = process.env.MCP_READER_TOKEN;
const operatorToken = process.env.MCP_OPERATOR_TOKEN;

if (!readerToken || !operatorToken) {
  throw new Error('Set MCP_READER_TOKEN and MCP_OPERATOR_TOKEN before starting the gateway.');
}

const app = createApp({
  authorizer: new TokenAuthorizer([
    { token: readerToken, subject: 'local-reader', scopes: ['inventory:read'] },
    { token: operatorToken, subject: 'local-operator', scopes: ['inventory:read', 'restock:draft'] }
  ])
});

const port = Number(process.env.PORT ?? 3200);
app.listen(port, '127.0.0.1', () => {
  console.log(`Secure MCP gateway listening on http://127.0.0.1:${port}/mcp`);
});
