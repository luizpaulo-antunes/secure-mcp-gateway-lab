import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { createInventoryMcpServer } from './mcp/inventory-tools.js';
import { createAuditLogger, type AuditSink } from './security/audit.js';
import { bearerAuthentication, TokenAuthorizer } from './security/auth.js';
import { SecurityContext } from './security/context.js';
import { FixedWindowRateLimiter } from './security/rate-limiter.js';

export type AppOptions = {
  authorizer: TokenAuthorizer;
  rateLimiter?: FixedWindowRateLimiter;
  auditSink?: AuditSink;
};

export function createApp(options: AppOptions) {
  const app = createMcpExpressApp({
    host: '127.0.0.1',
    allowedHosts: ['127.0.0.1', 'localhost']
  });
  const context = new SecurityContext();
  const audit = createAuditLogger(options.auditSink);
  const rateLimiter = options.rateLimiter ?? new FixedWindowRateLimiter(60, 60_000);

  app.use('/mcp', bearerAuthentication(options.authorizer));
  app.use('/mcp', rateLimiter.middleware());

  app.post('/mcp', async (request, response) => {
    await context.run(response.locals.auth, async () => {
      const server = createInventoryMcpServer(context, audit);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });

      try {
        await server.connect(transport);
        await transport.handleRequest(request, response, request.body);
      } catch {
        audit({ subject: context.current().subject, action: 'mcp_request', outcome: 'error' });
        if (!response.headersSent) response.status(500).json({ error: 'internal_server_error' });
      } finally {
        await transport.close();
        await server.close();
      }
    });
  });

  app.get('/mcp', (_request, response) => response.status(405).json({ error: 'method_not_allowed' }));
  app.delete('/mcp', (_request, response) => response.status(405).json({ error: 'method_not_allowed' }));

  return app;
}
