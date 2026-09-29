# Threat model

## Protected assets

- tool authorization boundaries;
- synthetic inventory records;
- credentials and request metadata;
- audit integrity;
- gateway availability.

## Representative threats and controls

| Threat | Control in this lab | Verification |
| --- | --- | --- |
| Anonymous tool invocation | Bearer authentication | Integration test expects `401` |
| Excessive tool requests | Per-subject fixed-window rate limit | Middleware unit boundary |
| Unauthorized write-like action | Per-tool scopes | Read-only client receives MCP tool error |
| Destructive action | Draft-only tool requiring human approval | Tool contract and output assertion |
| Secret leakage in logs | Recursive structured redaction | Unit test |
| DNS rebinding against localhost | MCP SDK host-header validation | Application configuration |
| Invalid tool arguments | Zod schemas at the MCP boundary | MCP SDK validation |

## Explicit limitations

Opaque local tokens are used only to keep the example small. A deployed gateway should use an external identity provider, token expiry, audience/resource validation, key rotation, distributed rate limiting, durable audit storage, TLS termination, and monitored incident response.
