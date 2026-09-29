# Secure MCP Gateway & Resilience Lab

A sanitized TypeScript portfolio project showing how to place explicit security and reliability boundaries around MCP tools exposed through Streamable HTTP.

## What this project proves

- I can test authentication and least-privilege authorization separately.
- I can expose read and non-destructive draft tools through MCP Streamable HTTP.
- I can make denied actions observable without logging credentials or personal data.
- I can design negative and abuse cases alongside the happy path.

## Architecture

```text
MCP client
   │
   ▼
Host validation → Bearer auth → Rate limit → MCP transport
                                              │
                         ┌────────────────────┴───────────────────┐
                         ▼                                        ▼
              get_inventory                              create_restock_draft
              inventory:read                             restock:draft
                         │                                        │
                         └──────── redacted audit events ─────────┘
```

## Implemented controls

- localhost host-header validation to reduce DNS-rebinding risk;
- bearer-token authentication with hashed, timing-safe comparison;
- per-tool scopes and least privilege;
- fixed-window per-subject rate limiting;
- Zod input schemas;
- structured audit logging with recursive redaction;
- draft-only write behavior with human approval;
- sanitized unit and MCP integration tests.

## Quick start

```bash
npm install
npm run test:all
```

To run the local gateway:

```bash
export MCP_READER_TOKEN='local-reader-value'
export MCP_OPERATOR_TOKEN='local-operator-value'
npm start
```

The endpoint is `http://127.0.0.1:3200/mcp` by default.

## Testing strategy

The integration suite starts the real HTTP gateway, connects with the MCP client SDK, lists tools, calls the read tool, and proves that a read-only identity cannot create a restock draft. Unit tests cover token validation and audit redaction.

See [the threat model](docs/threat-model.md) for the assets, threats, controls, and known limitations.

## Not production-ready

This lab deliberately uses local opaque tokens and an in-memory rate limiter. Production deployments should use OAuth/OIDC, TLS, audience validation, token rotation, distributed rate limiting, durable audit storage, and operational monitoring.

## Sanitization

All inventory records, identities, tokens, and events are synthetic. Never add production credentials, private endpoints, customer data, internal threat reports, or employer configuration.
