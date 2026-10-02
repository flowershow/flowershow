// Claim tokens are bearer credentials (fs_claim_ + a JWT, whose characters are
// all URL-safe, so they look the same raw or URL-encoded).
const CLAIM_TOKEN_RE = /fs_claim_[A-Za-z0-9._-]+/g;
const REDACTED = 'fs_claim_REDACTED';

export function redactClaimTokens(value: string): string {
  return value.replace(CLAIM_TOKEN_RE, REDACTED);
}

function redactDeep(value: unknown): unknown {
  if (typeof value === 'string') return redactClaimTokens(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, redactDeep(v)]),
    );
  }
  return value;
}

/** PostHog `before_send` hook: never ship a claim token in any event property. */
export function redactClaimTokensInEvent<T>(event: T | null): T | null {
  if (!event) return event;
  // Cheap check first: almost no events contain a token.
  if (!JSON.stringify(event).includes('fs_claim_')) return event;
  return redactDeep(event) as T;
}
