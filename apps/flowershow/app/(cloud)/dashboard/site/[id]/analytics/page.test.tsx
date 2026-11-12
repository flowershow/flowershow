import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { url });
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/server/auth', () => ({
  getSession: vi.fn(async () => ({ user: { id: 'me' } })),
}));
vi.mock('@/server/db', () => ({
  default: { site: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/site-analytics/umami-client', () => ({
  getUmamiClient: () => ({}),
}));
vi.mock('@/lib/get-site-url', () => ({
  getSiteUrl: () => 'https://x.flowershow.me',
}));
vi.mock('@/lib/site-analytics/site-analytics', () => ({
  getSiteAnalytics: vi.fn(async () => ({ status: 'unavailable' })),
  loadSiteCountability: vi.fn(),
}));

import {
  getSiteAnalytics,
  loadSiteCountability,
} from '@/lib/site-analytics/site-analytics';
import prisma from '@/server/db';
import SiteAnalyticsPage from './page';

const findUnique = prisma.site.findUnique as unknown as ReturnType<
  typeof vi.fn
>;
const site = (userId: string) => ({
  id: 's1',
  projectName: 'p',
  customDomain: null,
  subdomain: 'x',
  privacyMode: 'PUBLIC',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  user: { username: 'u' },
  userId,
  plan: 'FREE',
  members: [],
});
const props = {
  params: Promise.resolve({ id: 's1' }),
  searchParams: Promise.resolve({}),
};

beforeEach(() => {
  vi.mocked(getSiteAnalytics).mockClear();
  vi.mocked(loadSiteCountability).mockReset();
});

describe('SiteAnalyticsPage', () => {
  it('is not found for a non-owner', async () => {
    findUnique.mockResolvedValueOnce(site('someone-else'));
    await expect(SiteAnalyticsPage(props)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getSiteAnalytics).not.toHaveBeenCalled();
  });

  it('is not found for a missing site', async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(SiteAnalyticsPage(props)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it.each(['password', 'html-only'] as const)(
    'skips Umami for a %s site',
    async (kind) => {
      findUnique.mockResolvedValueOnce(site('me'));
      vi.mocked(loadSiteCountability).mockResolvedValueOnce({
        kind,
        hasRawHtml: kind === 'html-only',
      });
      await SiteAnalyticsPage(props);
      expect(getSiteAnalytics).not.toHaveBeenCalled();
    },
  );

  it('loads numbers for a counted site', async () => {
    findUnique.mockResolvedValueOnce(site('me'));
    vi.mocked(loadSiteCountability).mockResolvedValueOnce({
      kind: 'counted',
      hasRawHtml: false,
    });
    await SiteAnalyticsPage(props);
    expect(getSiteAnalytics).toHaveBeenCalledOnce();
  });
});
