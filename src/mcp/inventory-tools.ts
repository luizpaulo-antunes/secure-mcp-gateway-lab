import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { createAuditLogger } from '../security/audit.js';
import { SecurityContext } from '../security/context.js';
import type { Scope } from '../security/types.js';

type AuditLogger = ReturnType<typeof createAuditLogger>;

const syntheticInventory: Record<string, { sku: string; available: number }> = {
  'SKU-1001': { sku: 'SKU-1001', available: 14 },
  'SKU-1002': { sku: 'SKU-1002', available: 3 }
};

export function createInventoryMcpServer(context: SecurityContext, audit: AuditLogger): McpServer {
  const server = new McpServer({ name: 'secure-inventory-gateway', version: '0.1.0' });

  server.registerTool('get_inventory', {
    description: 'Read synthetic inventory.',
    inputSchema: { sku: z.string().regex(/^SKU-\d{4}$/) }
  }, async ({ sku }) => {
    const denied = requireScope(context, audit, 'inventory:read', 'get_inventory');
    if (denied) return denied;
    const item = syntheticInventory[sku];
    audit({ subject: context.current().subject, action: 'get_inventory', outcome: 'allowed', details: { sku } });
    return item
      ? { content: [{ type: 'text', text: JSON.stringify(item) }] }
      : { isError: true, content: [{ type: 'text', text: 'Synthetic SKU not found.' }] };
  });

  server.registerTool('create_restock_draft', {
    description: 'Create a non-executing restock draft that requires human approval.',
    inputSchema: {
      sku: z.string().regex(/^SKU-\d{4}$/),
      quantity: z.number().int().min(1).max(100)
    }
  }, async ({ sku, quantity }) => {
    const denied = requireScope(context, audit, 'restock:draft', 'create_restock_draft');
    if (denied) return denied;
    const draft = { draftId: `DRAFT-${sku}-${quantity}`, sku, quantity, requiresHumanApproval: true };
    audit({ subject: context.current().subject, action: 'create_restock_draft', outcome: 'allowed', details: { sku, quantity } });
    return { content: [{ type: 'text', text: JSON.stringify(draft) }] };
  });

  return server;
}

function requireScope(
  context: SecurityContext,
  audit: AuditLogger,
  scope: Scope,
  action: string
): { isError: true; content: [{ type: 'text'; text: string }] } | undefined {
  if (context.hasScope(scope)) return undefined;
  audit({ subject: context.current().subject, action, outcome: 'denied', details: { requiredScope: scope } });
  return { isError: true, content: [{ type: 'text', text: `Missing required scope: ${scope}.` }] };
}
