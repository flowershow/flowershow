import { describe, expect, it } from 'vitest';
import {
  redactClaimTokens,
  redactClaimTokensInEvent,
} from './redact-claim-token';

const T = 'fs_claim_eyJhbGciOiJIUzI1NiJ9.eyJzaXRlSWQiOiJzMSJ9.abc-_DEF';

describe('redactClaimTokens', () => {
  it('redacts a token in a query string, fragment or encoded callbackUrl', () => {
    expect(
      redactClaimTokens(`https://flowershow.app/claim?siteId=s1&token=${T}`),
    ).toBe('https://flowershow.app/claim?siteId=s1&token=fs_claim_REDACTED');
    expect(
      redactClaimTokens(`https://flowershow.app/claim?siteId=s1#token=${T}`),
    ).toBe('https://flowershow.app/claim?siteId=s1#token=fs_claim_REDACTED');
    expect(
      redactClaimTokens(
        `https://cloud.flowershow.app/login?callbackUrl=${encodeURIComponent(`https://flowershow.app/claim?siteId=s1&token=${T}`)}`,
      ),
    ).not.toContain('eyJ');
  });

  it('leaves other strings alone', () => {
    expect(redactClaimTokens('https://flowershow.app/claim?siteId=s1')).toBe(
      'https://flowershow.app/claim?siteId=s1',
    );
  });
});

describe('redactClaimTokensInEvent', () => {
  it('redacts every string property of a PostHog event', () => {
    const event = {
      event: '$pageview',
      properties: {
        $current_url: `https://flowershow.app/claim?siteId=s1#token=${T}`,
        $referrer: `https://flowershow.app/claim?token=${T}`,
        $initial_current_url: `https://flowershow.app/claim?token=${T}`,
        n: 3,
      },
      $set_once: { $initial_current_url: `https://x/?token=${T}` },
    };
    const out = redactClaimTokensInEvent(event);
    expect(JSON.stringify(out)).not.toContain('eyJ');
    expect(out?.properties.n).toBe(3);
  });

  it('passes null through', () => {
    expect(redactClaimTokensInEvent(null)).toBeNull();
  });
});
