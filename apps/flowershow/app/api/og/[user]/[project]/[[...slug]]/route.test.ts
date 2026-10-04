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
    },
  },
}));

vi.mock('@/lib/social-card-render', () => ({
  renderSocialCardPng: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
}));

vi.mock('@/lib/feature-flags', () => ({
  isSocialCardsEnabled: vi.fn(() => true),
}));

vi.mock('@/lib/get-site-url', () => ({
  getSiteUrl: vi.fn(() => 'https://site.test'),
}));

import { isSocialCardsEnabled } from '@/lib/feature-flags';
import { renderSocialCardPng } from '@/lib/social-card-render';
import prisma from '@/server/db';
import { api } from '@/trpc/server';
import { GET } from './route';

const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;
const getConfig = api.site.getConfig.query as ReturnType<typeof vi.fn>;
const getBlob = api.site.getBlob.query as ReturnType<typeof vi.fn>;
const render = renderSocialCardPng as ReturnType<typeof vi.fn>;

const SECRET = 'SENTINEL secret page title';

const site = (privacyMode: 'PUBLIC' | 'PASSWORD') => ({
  id: 'site-1',
  privacyMode,
  plan: 'FREE',
  projectName: 'notes',
  customDomain: null,
  subdomain: null,
  configJson: { siteName: 'Garden', description: 'Site tagline' },
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
    metadata: { title: SECRET, description: `${SECRET} description` },
  });
});

describe('GET /api/og — password-protected sites', () => {
  it('never reads the page or file config and renders the site card', async () => {
    findFirst.mockResolvedValue(site('PASSWORD'));

    const res = await call({ user: 'ana', project: 'notes', slug: ['secret'] });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(getBlob).not.toHaveBeenCalled();
    expect(getConfig).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
    const inputs = render.mock.calls[0]?.[0];
    expect(inputs.page).toBeNull();
    expect(inputs.siteName).toBe('Garden');
    expect(JSON.stringify(render.mock.calls)).not.toContain('SENTINEL');
  });
});

describe('GET /api/og — public sites', () => {
  it('looks up the page by its decoded slug and renders it', async () => {
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
    expect(render.mock.calls[0]?.[0].page.title).toBe(SECRET);
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
