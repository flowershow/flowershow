import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/server/db', () => ({
  default: { site: { findFirst: vi.fn() } },
}));

vi.mock('@/trpc/server', () => ({
  api: {
    site: {
      getConfig: { query: vi.fn() },
      getBlob: { query: vi.fn() },
      getAllBlobPaths: { query: vi.fn() },
      getImageDimensionsMap: { query: vi.fn() },
    },
  },
}));

vi.mock('@/lib/social-card-render', () => ({
  renderSocialCard: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
}));

vi.mock('@/lib/content-store', () => ({
  fetchFileBytes: vi.fn(async () => null),
}));

vi.mock('@/lib/feature-flags', () => ({
  isSocialCardsEnabled: vi.fn(() => true),
}));

vi.mock('@/lib/get-site-url', () => ({
  getSiteUrl: vi.fn(() => 'https://site.test'),
}));

import { fetchFileBytes } from '@/lib/content-store';
import { isSocialCardsEnabled } from '@/lib/feature-flags';
import { renderSocialCard } from '@/lib/social-card-render';
import prisma from '@/server/db';
import { api } from '@/trpc/server';
import { GET } from './route';

const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;
const getConfig = api.site.getConfig.query as ReturnType<typeof vi.fn>;
const getBlob = api.site.getBlob.query as ReturnType<typeof vi.fn>;
const getPaths = api.site.getAllBlobPaths.query as ReturnType<typeof vi.fn>;
const getDims = api.site.getImageDimensionsMap.query as ReturnType<
  typeof vi.fn
>;
const render = renderSocialCard as ReturnType<typeof vi.fn>;

const SECRET = 'SENTINEL secret page title';

const site = (privacyMode: 'PUBLIC' | 'PASSWORD') => ({
  id: 'site-1',
  privacyMode,
  plan: 'FREE',
  projectName: 'notes',
  customDomain: null,
  subdomain: null,
  configJson: {
    siteName: 'Garden',
    description: 'Site tagline',
    image: '/cover.jpg',
  },
  user: { username: 'ana' },
});

function call(params: { user: string; project: string; slug?: string[] }) {
  return GET(new NextRequest('http://localhost/api/og/x?v=abc'), {
    params: Promise.resolve(params),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getConfig.mockResolvedValue({ siteName: 'Garden' });
  getBlob.mockResolvedValue({
    sha: 'sha1',
    path: 'blog/my post.md',
    metadata: { title: SECRET, description: `${SECRET} description` },
  });
  getPaths.mockResolvedValue(['/blog/my post.md', '/blog/cover.jpg']);
  getDims.mockResolvedValue({
    '/blog/cover.jpg': { width: 1200, height: 800 },
  });
});

describe('GET /api/og — password-protected sites', () => {
  it('never reads the page, file config or site files, and renders the site card', async () => {
    findFirst.mockResolvedValue(site('PASSWORD'));

    const res = await call({ user: 'ana', project: 'notes', slug: ['secret'] });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(getBlob).not.toHaveBeenCalled();
    expect(getConfig).not.toHaveBeenCalled();
    expect(getPaths).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
    const inputs = render.mock.calls[0]?.[0];
    expect(inputs.page).toBeNull();
    expect(inputs.image).toBeNull();
    expect(inputs.siteName).toBe('Garden');
    expect(JSON.stringify(render.mock.calls)).not.toContain('SENTINEL');
  });
});

describe('GET /api/og — public sites', () => {
  it('looks up the page by its decoded slug and renders it with its section', async () => {
    findFirst.mockResolvedValue(site('PUBLIC'));

    const res = await call({
      user: 'ana',
      project: 'notes',
      slug: ['blog', 'my%20post'],
    });

    expect(res.status).toBe(200);
    expect(getBlob).toHaveBeenCalledWith({
      siteId: 'site-1',
      slug: '/blog/my+post',
    });
    const [inputs, domain] = render.mock.calls[0]!;
    expect(inputs.page).toMatchObject({ title: SECRET, section: 'Blog' });
    expect(inputs.image).toBeNull();
    expect(domain).toBe('site.test');
  });

  it("puts the page's picture on the card and reads it from the site's storage", async () => {
    findFirst.mockResolvedValue(site('PUBLIC'));
    getBlob.mockResolvedValue({
      sha: 'sha1',
      path: 'blog/my post.md',
      metadata: { title: 'Post', image: 'cover.jpg' },
    });

    await call({ user: 'ana', project: 'notes', slug: ['blog', 'my%20post'] });

    const [inputs, , opts] = render.mock.calls[0]!;
    expect(inputs.image).toMatchObject({
      sitePath: 'blog/cover.jpg',
      width: 1200,
      height: 800,
    });
    await opts.readSiteFile('blog/cover.jpg', 100);
    expect(fetchFileBytes).toHaveBeenCalledWith({
      projectId: 'site-1',
      path: 'blog/cover.jpg',
      maxBytes: 100,
    });
  });

  it('skips the file lookups when neither page nor site has an image', async () => {
    findFirst.mockResolvedValue(site('PUBLIC'));
    await call({ user: 'ana', project: 'notes', slug: ['blog', 'my%20post'] });
    expect(getPaths).not.toHaveBeenCalled();
  });
});

describe('GET /api/og — bad requests', () => {
  it('404s on malformed percent-encoding instead of throwing', async () => {
    const res = await call({ user: '%E0%A4%A', project: 'notes' });
    expect(res.status).toBe(404);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('404s when the flag is off', async () => {
    vi.mocked(isSocialCardsEnabled).mockReturnValueOnce(false);
    const res = await call({ user: 'ana', project: 'notes' });
    expect(res.status).toBe(404);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
