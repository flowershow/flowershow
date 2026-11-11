import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_CLOUD_DOMAIN: 'cloud.flowershow.test',
    NEXT_PUBLIC_ROOT_DOMAIN: 'flowershow.test',
  },
}));

import { ANONYMOUS_USER_ID } from './anonymous-user-constants';
import { posthogModeForSite, shouldBootstrapPostHog } from './posthog-scope';

describe('posthogModeForSite', () => {
  it('is full on flowershow.app', () => {
    expect(
      posthogModeForSite({
        customDomain: 'flowershow.app',
        user: { id: 'u1' },
      }),
    ).toBe('full');
  });

  it('is memory on anonymous (temporary) sites', () => {
    expect(
      posthogModeForSite({
        customDomain: null,
        user: { id: ANONYMOUS_USER_ID },
      }),
    ).toBe('memory');
  });

  it('is off on claimed sites, on a subdomain or a custom domain', () => {
    expect(posthogModeForSite({ customDomain: null, user: { id: 'u1' } })).toBe(
      'off',
    );
    expect(
      posthogModeForSite({ customDomain: 'example.com', user: { id: 'u1' } }),
    ).toBe('off');
  });
});

describe('shouldBootstrapPostHog', () => {
  it('is true for the cloud, root and flowershow.app hosts', () => {
    expect(shouldBootstrapPostHog('cloud.flowershow.test')).toBe(true);
    expect(shouldBootstrapPostHog('flowershow.test')).toBe(true);
    expect(shouldBootstrapPostHog('flowershow.app')).toBe(true);
  });

  it('is false for published sites', () => {
    expect(shouldBootstrapPostHog('rufus.flowershow.me')).toBe(false);
    expect(shouldBootstrapPostHog('example.com')).toBe(false);
  });
});
