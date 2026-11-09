import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { enabled, q } = vi.hoisted(() => ({
  enabled: vi.fn(),
  q: {
    getById: vi.fn(),
    getDbConfig: vi.fn(),
    getSiteSubscription: vi.fn(),
    getBundleInfo: vi.fn(),
    getSiteBillingStatus: vi.fn(),
  },
}));

vi.mock('@/lib/account-plans', () => ({
  accountPlansEnabled: () => enabled(),
}));
vi.mock('@/lib/feature-flags', () => ({
  Feature: {},
  isFeatureEnabled: () => false,
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/trpc/server', () => ({
  api: {
    site: {
      getById: { query: q.getById },
      getDbConfig: { query: q.getDbConfig },
    },
    stripe: {
      getSiteSubscription: { query: q.getSiteSubscription },
      getBundleInfo: { query: q.getBundleInfo },
      getSiteBillingStatus: { query: q.getSiteBillingStatus },
    },
    github: { listInstallations: { query: vi.fn() } },
  },
}));

// Marker components so the rendered tree can be searched by type.
vi.mock('@/components/dashboard/billing', () => ({ default: () => null }));
vi.mock('@/components/dashboard/form', () => ({ default: () => null }));
vi.mock('@/components/dashboard/form/delete-site-form', () => ({
  default: () => null,
}));
vi.mock('@/components/dashboard/form/github-connection-form', () => ({
  default: () => null,
}));
vi.mock('@/components/dashboard/form/image-upload-form', () => ({
  default: () => null,
}));
vi.mock('@/components/dashboard/form/repo-access-lost-form', () => ({
  default: () => null,
}));
vi.mock('@/components/dashboard/form/site-password-form', () => ({
  default: () => null,
}));
vi.mock('@/components/dashboard/json-form', () => ({ default: () => null }));
vi.mock('@/components/dashboard/settings-nav', () => ({ default: () => null }));

import Billing from '@/components/dashboard/billing';
import SiteSettingsPage from './page';

function findAll(node: unknown, type: unknown, out: ReactElement[] = []) {
  if (Array.isArray(node)) node.forEach((n) => findAll(n, type, out));
  else if (node && typeof node === 'object' && 'props' in node) {
    const el = node as ReactElement<{ children?: unknown }>;
    if (el.type === type) out.push(el);
    findAll(el.props.children, type, out);
  }
  return out;
}

const live = {
  activeSiteCount: 0,
  prices: { month: { amount: 111, currency: 'USD' }, year: null },
  tiers: [],
  nextSiteDiscountPercent: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  q.getById.mockResolvedValue({ id: 'site-1', plan: 'FREE' });
  q.getDbConfig.mockResolvedValue(null);
  q.getSiteSubscription.mockResolvedValue(null);
  q.getBundleInfo.mockResolvedValue(live);
  q.getSiteBillingStatus.mockResolvedValue({
    planSource: null,
    accountPlan: null,
  });
});

describe('site settings page billing data', () => {
  it.each([true, false])(
    'always fetches live bundle info and passes it on (flag %s)',
    async (flag) => {
      enabled.mockReturnValue(flag);
      const tree = await SiteSettingsPage({
        params: Promise.resolve({ id: 'site-1' }),
      });
      expect(q.getBundleInfo).toHaveBeenCalledTimes(1);
      const [billing] = findAll(tree, Billing);
      expect(billing?.props).toMatchObject({
        bundleInfo: live,
        accountPlansEnabled: flag,
        sitePlan: 'FREE',
      });
    },
  );

  it('does not fetch the billing status while account plans are dark', async () => {
    enabled.mockReturnValue(false);
    await SiteSettingsPage({ params: Promise.resolve({ id: 'site-1' }) });
    expect(q.getSiteBillingStatus).not.toHaveBeenCalled();
  });
});
