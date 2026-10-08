import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({
  default: {
    site: { findFirst: vi.fn() },
    blob: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/content-store', () => ({
  fetchFile: vi.fn().mockResolvedValue('User-agent: *\nDisallow: /'),
}));

import prisma from '@/server/db';
import { GET } from './route';

const findSite = prisma.site.findFirst as ReturnType<typeof vi.fn>;
const findBlob = prisma.blob.findFirst as ReturnType<typeof vi.fn>;

function call(hostname: string) {
  return GET(new NextRequest(`http://${hostname}/robots.txt`), {
    params: Promise.resolve({ hostname }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  findSite.mockResolvedValue({ id: 'site-1' });
});

describe('GET /api/robots — nosniff', () => {
  it("sets nosniff on the site's own robots.txt", async () => {
    findBlob.mockResolvedValue({ path: 'robots.txt' });
    const res = await call('notes-alice.test.localhost');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Disallow: /');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('sets nosniff on the generated robots.txt', async () => {
    findBlob.mockResolvedValue(null);
    const res = await call('notes-alice.test.localhost');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Sitemap:');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
