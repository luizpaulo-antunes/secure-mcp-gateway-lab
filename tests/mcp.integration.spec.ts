import type { AddressInfo } from 'node:net';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { TokenAuthorizer } from '../src/security/auth.js';

const servers: Array<ReturnType<ReturnType<typeof createApp>['listen']>> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

describe('MCP gateway integration', () => {
  it('rejects requests without a bearer token', async () => {
    const url = await startGateway();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });

    expect(response.status).toBe(401);
  });

  it('allows reads but denies draft creation for a read-only client', async () => {
    const url = await startGateway();
    const client = new Client({ name: 'integration-test', version: '0.1.0' });
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { authorization: 'Bearer synthetic-reader-token' } }
    });

    await client.connect(transport);
    const tools = await client.listTools();
    const read = await client.callTool({ name: 'get_inventory', arguments: { sku: 'SKU-1001' } });
    const denied = await client.callTool({ name: 'create_restock_draft', arguments: { sku: 'SKU-1001', quantity: 5 } });

    expect(tools.tools.map((tool) => tool.name)).toEqual(['get_inventory', 'create_restock_draft']);
    expect(read.isError).not.toBe(true);
    expect(denied.isError).toBe(true);
    await client.close();
  });
});

async function startGateway(): Promise<string> {
  const app = createApp({
    authorizer: new TokenAuthorizer([
      { token: 'synthetic-reader-token', subject: 'reader', scopes: ['inventory:read'] }
    ]),
    auditSink: () => undefined
  });
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}/mcp`;
}
