import { describe, expect, it, vi } from 'vitest';
import { resolveChangelogContext } from './changelog-context';

const files = [
  '/changelog/2026-01-01-a.md',
  '/changelog/README.md',
  '/releases/2026-01-01-r.md',
  '/releases/README.md',
  '/blog/post.md',
];

describe('resolveChangelogContext', () => {
  it('folder README in changelog/ → index', async () => {
    const ctx = await resolveChangelogContext({
      slug: '/changelog',
      blob: { path: 'changelog/README.md', metadata: {} },
      siteFilePaths: files,
      getFolderIndexMetadata: vi.fn(),
    });
    expect(ctx).toEqual({ kind: 'index', dir: 'changelog' });
  });
  it('folder README opting out → null', async () => {
    const ctx = await resolveChangelogContext({
      slug: '/changelog',
      blob: { path: 'changelog/README.md', metadata: { layout: 'default' } },
      siteFilePaths: files,
      getFolderIndexMetadata: vi.fn(),
    });
    expect(ctx).toBeNull();
  });
  it('any folder README with layout: changelog → index', async () => {
    const ctx = await resolveChangelogContext({
      slug: '/releases',
      blob: { path: 'releases/README.md', metadata: { layout: 'changelog' } },
      siteFilePaths: files,
      getFolderIndexMetadata: vi.fn(),
    });
    expect(ctx).toEqual({ kind: 'index', dir: 'releases' });
  });
  it('no blob, changelog folder with markdown files → index (README-less)', async () => {
    const ctx = await resolveChangelogContext({
      slug: '/changelog',
      blob: null,
      siteFilePaths: ['/changelog/2026-01-01-a.md'],
      getFolderIndexMetadata: vi.fn(),
    });
    expect(ctx).toEqual({ kind: 'index', dir: 'changelog' });
  });
  it('no blob, non-changelog or empty folder → null', async () => {
    expect(
      await resolveChangelogContext({
        slug: '/blog',
        blob: null,
        siteFilePaths: files,
        getFolderIndexMetadata: vi.fn(),
      }),
    ).toBeNull();
    expect(
      await resolveChangelogContext({
        slug: '/changelog',
        blob: null,
        siteFilePaths: ['/other.md'],
        getFolderIndexMetadata: vi.fn(),
      }),
    ).toBeNull();
  });
  it('file inside changelog/ → entry, consulting the folder index', async () => {
    const getMeta = vi.fn().mockResolvedValue(null);
    const ctx = await resolveChangelogContext({
      slug: '/changelog/2026-01-01-a',
      blob: { path: 'changelog/2026-01-01-a.md', metadata: {} },
      siteFilePaths: files,
      getFolderIndexMetadata: getMeta,
    });
    expect(ctx).toEqual({ kind: 'entry', dir: 'changelog' });
    expect(getMeta).toHaveBeenCalledWith('changelog');
  });
  it('file inside an opted-in folder → entry', async () => {
    const ctx = await resolveChangelogContext({
      slug: '/releases/2026-01-01-r',
      blob: { path: 'releases/2026-01-01-r.md', metadata: {} },
      siteFilePaths: files,
      getFolderIndexMetadata: vi
        .fn()
        .mockResolvedValue({ layout: 'changelog' }),
    });
    expect(ctx).toEqual({ kind: 'entry', dir: 'releases' });
  });
  it("an entry's own layout does not take it out of the changelog", async () => {
    const getMeta = vi.fn().mockResolvedValue(null);
    const ctx = await resolveChangelogContext({
      slug: '/changelog/x',
      blob: { path: 'changelog/x.md', metadata: { layout: 'default' } },
      siteFilePaths: files,
      getFolderIndexMetadata: getMeta,
    });
    expect(ctx).toEqual({ kind: 'entry', dir: 'changelog' });
    expect(getMeta).toHaveBeenCalledWith('changelog');
  });
  it("an entry's own layout does not opt a folder that opted out back in", async () => {
    const ctx = await resolveChangelogContext({
      slug: '/changelog/x',
      blob: { path: 'changelog/x.md', metadata: { layout: 'changelog' } },
      siteFilePaths: files,
      getFolderIndexMetadata: vi.fn().mockResolvedValue({ layout: 'default' }),
    });
    expect(ctx).toBeNull();
  });
  it('non-markdown blobs are never changelog pages', async () => {
    const ctx = await resolveChangelogContext({
      slug: '/changelog/board',
      blob: { path: 'changelog/board.canvas', metadata: null },
      siteFilePaths: files,
      getFolderIndexMetadata: vi.fn(),
    });
    expect(ctx).toBeNull();
  });
});
