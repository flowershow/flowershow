import { afterEach, describe, expect, it, vi } from 'vitest';

const { updateMany } = vi.hoisted(() => ({ updateMany: vi.fn() }));
vi.mock('@/server/db', () => ({ default: { site: { updateMany } } }));

import {
  customDomainRedirect,
  markCustomDomainLive,
} from './custom-domain-redirect';

afterEach(() => {
  vi.resetAllMocks();
});

const live = new Date('2026-11-12T00:00:00Z');
const site = { id: 's1', customDomain: 'docs.example.com' };

describe('customDomainRedirect', () => {
  it('redirects once a request has reached the site through the domain', () => {
    expect(
      customDomainRedirect('alice', { ...site, customDomainLiveAt: live }),
    ).toBe('https://docs.example.com');
  });

  it('serves the site on its Flowershow address while the domain is pending', () => {
    expect(
      customDomainRedirect('alice', { ...site, customDomainLiveAt: null }),
    ).toBeNull();
  });

  it('never redirects on the custom domain itself, anonymous sites, or sites without one', () => {
    const liveSite = { ...site, customDomainLiveAt: live };
    expect(customDomainRedirect('_domain', liveSite)).toBeNull();
    expect(customDomainRedirect('anon', liveSite)).toBeNull();
    expect(
      customDomainRedirect('alice', {
        customDomain: null,
        customDomainLiveAt: live,
      }),
    ).toBeNull();
  });
});

describe('markCustomDomainLive', () => {
  it('records the first request, only for the domain it came through', async () => {
    await markCustomDomainLive({ ...site, customDomainLiveAt: null });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 's1',
        customDomain: 'docs.example.com',
        customDomainLiveAt: null,
      },
      data: { customDomainLiveAt: expect.any(Date) },
    });
  });

  it('writes nothing once live or without a domain', async () => {
    await markCustomDomainLive({ ...site, customDomainLiveAt: live });
    await markCustomDomainLive({
      id: 's1',
      customDomain: null,
      customDomainLiveAt: null,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });
});
