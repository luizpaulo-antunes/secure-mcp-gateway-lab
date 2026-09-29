export type AuditEvent = {
  timestamp: string;
  subject: string;
  action: string;
  outcome: 'allowed' | 'denied' | 'error';
  details?: Record<string, unknown>;
};

export type AuditSink = (event: AuditEvent) => void;

const sensitiveKey = /authorization|token|secret|password|email|cpf/i;

export function redact(value: unknown, key = ''): unknown {
  if (sensitiveKey.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)])
    );
  }
  return value;
}

export function createAuditLogger(sink: AuditSink = (event) => console.log(JSON.stringify(event))) {
  return (event: Omit<AuditEvent, 'timestamp'>): void => {
    sink(redact({ ...event, timestamp: new Date().toISOString() }) as AuditEvent);
  };
}
