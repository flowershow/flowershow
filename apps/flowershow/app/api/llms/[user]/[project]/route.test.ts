import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({
  default: {
    site: { findFirst: vi.fn() },
    blob: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('@/lib/content-store', () => ({
  fetchFile: vi.fn(),
}));

vi.mock('@/lib/get-site-url', () => ({
  getSiteUrl: vi.fn().mockReturnValue('https://notes.test'),
}));

import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';
import { fetchFile } from '@/lib/content-store';
import prisma from '@/server/db';
import { GET } from './route';

const findSite = prisma.site.findFirst as ReturnType<typeof vi.fn>;
const findBlob = prisma.blob.findUnique as ReturnType<typeof vi.fn>;
const findBlobs = prisma.blob.findMany as ReturnType<typeof vi.fn>;
const fetchFileMock = fetchFile as ReturnType<typeof vi.fn>;

// The site's own host in the test env (NEXT_PUBLIC_SITE_DOMAIN=test.localhost).
const SITE_HOST = 'notes-alice.test.localhost';

function makeReq(host = SITE_HOST): NextRequest {
  return new NextRequest(`http://${host}/api/llms/alice/notes`, {
    headers: { host },
  });
}

const params = () => ({
  params: Promise.resolve({ user: 'alice', project: 'notes' }),
});

const baseSite = {
  id: 'site-1',
  userId: 'owner-1',
  privacyMode: 'PUBLIC',
  tokenVersion: 1,
  projectName: 'notes',
  subdomain: 'notes-alice',
  customDomain: null,
  configJson: { enableLlmsTxt: true, siteName: 'Alice Notes' },
  isTemporary: false,
  expiresAt: null,
  user: { username: 'alice' },
};

const blobs = [
  {
    path: 'README.md',
    metadata: { title: 'Home', description: 'Notes by Alice' },
  },
  { path: 'docs/setup.md', metadata: { title: 'Setup', description: 'How' } },
  { path: 'docs/wip.md', metadata: { title: 'WIP', draft: true } },
];

beforeEach(() => {
  vi.clearAllMocks();
  findBlob.mockResolvedValue(null);
  findBlobs.mockResolvedValue(blobs);
  fetchFileMock.mockResolvedValue(null);
});

describe('GET /api/llms — generated llms.txt', () => {
  it('lists published pages with .md links when enabled', async () => {
    findSite.mockResolvedValue(baseSite);

    const res = await GET(makeReq(), params());

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(res.headers.get('cache-control')).toContain('s-maxage=300');
    const body = await res.text();
    expect(body).toMatch(/^# Alice Notes\n\n> Notes by Alice\n/);
    expect(body).toContain('- [Setup](https://notes.test/docs/setup.md): How');
    expect(body).not.toContain('WIP');
  });

  it('enables from config.json too (file config wins)', async () => {
    findSite.mockResolvedValue({ ...baseSite, configJson: null });
    fetchFileMock.mockImplementation(async ({ path }) =>
      path === 'config.json' ? '{"enableLlmsTxt": true}' : null,
    );

    const res = await GET(makeReq(), params());

    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/^# notes\n/);
  });

  it('is 404 when not enabled', async () => {
    findSite.mockResolvedValue({ ...baseSite, configJson: {} });

    const res = await GET(makeReq(), params());

    expect(res.status).toBe(404);
    expect(findBlobs).not.toHaveBeenCalled();
  });

  it('is never generated for anonymous sites', async () => {
    findSite.mockResolvedValue({ ...baseSite, userId: ANONYMOUS_USER_ID });

    const res = await GET(makeReq(), params());

    expect(res.status).toBe(404);
  });

  it('is 404 for a password-protected site without access', async () => {
    findSite.mockResolvedValue({ ...baseSite, privacyMode: 'PASSWORD' });

    const res = await GET(makeReq(), params());

    expect(res.status).toBe(404);
    expect(findBlob).not.toHaveBeenCalled();
  });

  it('redirects requests from another host to the site host', async () => {
    findSite.mockResolvedValue(baseSite);

    const res = await GET(makeReq('evil.test.localhost'), params());

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`http://${SITE_HOST}/llms.txt`);
  });
});

describe('GET /api/llms — published llms.txt', () => {
  it('serves the published file instead of generating one', async () => {
    findSite.mockResolvedValue(baseSite);
    findBlob.mockResolvedValue({ id: 'b1' });
    fetchFileMock.mockImplementation(async ({ path }) =>
      path === 'llms.txt' ? '# Hand written\n' : null,
    );

    const res = await GET(makeReq(), params());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('# Hand written\n');
    expect(findBlobs).not.toHaveBeenCalled();
  });

  it('serves a published file even when generation is off', async () => {
    findSite.mockResolvedValue({ ...baseSite, configJson: {} });
    findBlob.mockResolvedValue({ id: 'b1' });
    fetchFileMock.mockResolvedValue('# Mine\n');

    const res = await GET(makeReq(), params());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('# Mine\n');
  });

  it('marks an anonymous site’s published file noindex', async () => {
    findSite.mockResolvedValue({ ...baseSite, userId: ANONYMOUS_USER_ID });
    findBlob.mockResolvedValue({ id: 'b1' });
    fetchFileMock.mockResolvedValue('# Anon\n');

    const res = await GET(makeReq(), params());

    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
  });
});
