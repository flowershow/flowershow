import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: { NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.local' },
}));

const query = {
  getSiteFooter: vi.fn(),
  getAllBlobPaths: vi.fn(),
  getPermalinksMapping: vi.fn(),
  getImageDimensionsMap: vi.fn(),
};
vi.mock('@/trpc/server', () => ({
  api: {
    site: {
      getSiteFooter: { query: (...a: unknown[]) => query.getSiteFooter(...a) },
      getAllBlobPaths: {
        query: (...a: unknown[]) => query.getAllBlobPaths(...a),
      },
      getPermalinksMapping: {
        query: (...a: unknown[]) => query.getPermalinksMapping(...a),
      },
      getImageDimensionsMap: {
        query: (...a: unknown[]) => query.getImageDimensionsMap(...a),
      },
    },
  },
}));

const renderPageContent = vi.fn();
vi.mock('@/lib/render-page-content', () => ({
  renderPageContent: (...a: unknown[]) => renderPageContent(...a),
}));

const generateScopedCss = vi.fn();
vi.mock('@/lib/generate-scoped-css', () => ({
  generateScopedCss: (...a: unknown[]) => generateScopedCss(...a),
}));

import { loadCustomFooter } from './site-footer';

const premiumSite = {
  id: 'site-1',
  plan: 'PREMIUM',
  customDomain: null,
  subdomain: 'my-site',
} as any;

describe('loadCustomFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.getSiteFooter.mockResolvedValue('Made by **Acme**');
    query.getAllBlobPaths.mockResolvedValue([]);
    query.getPermalinksMapping.mockResolvedValue({});
    query.getImageDimensionsMap.mockResolvedValue({});
    renderPageContent.mockResolvedValue(<p>Made by Acme</p>);
    generateScopedCss.mockResolvedValue({ css: '' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns null on the Free plan without fetching anything', async () => {
    const result = await loadCustomFooter({
      site: { ...premiumSite, plan: 'FREE' },
      siteConfig: null,
    });
    expect(result).toBeNull();
    expect(query.getSiteFooter).not.toHaveBeenCalled();
  });

  it('renders the footer for a Premium site (siteConfig may be a promise)', async () => {
    const result = await loadCustomFooter({
      site: premiumSite,
      siteConfig: Promise.resolve({ showTags: false } as any),
    });
    expect(result).not.toBeNull();
    expect(renderPageContent).toHaveBeenCalledWith(
      expect.objectContaining({ renderMode: 'md', showTags: false }),
    );
  });

  it('returns null when the file is missing', async () => {
    query.getSiteFooter.mockResolvedValue(null);
    expect(
      await loadCustomFooter({ site: premiumSite, siteConfig: null }),
    ).toBeNull();
  });

  it('returns null for a frontmatter-only file (keeps the default footer)', async () => {
    query.getSiteFooter.mockResolvedValue('---\npublish: false\n---\n\n  \n');
    expect(
      await loadCustomFooter({ site: premiumSite, siteConfig: null }),
    ).toBeNull();
    expect(renderPageContent).not.toHaveBeenCalled();
  });

  it('returns null when rendering the markdown throws', async () => {
    renderPageContent.mockRejectedValue(new Error('boom'));
    expect(
      await loadCustomFooter({ site: premiumSite, siteConfig: null }),
    ).toBeNull();
  });

  it('returns null when generating the scoped CSS throws', async () => {
    generateScopedCss.mockRejectedValue(new Error('unocss boom'));
    expect(
      await loadCustomFooter({ site: premiumSite, siteConfig: null }),
    ).toBeNull();
  });

  it('returns null when the footer fetch fails', async () => {
    query.getSiteFooter.mockRejectedValue(new Error('s3 down'));
    expect(
      await loadCustomFooter({ site: premiumSite, siteConfig: null }),
    ).toBeNull();
  });
});
