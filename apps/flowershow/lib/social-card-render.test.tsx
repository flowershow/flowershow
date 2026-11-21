// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  SocialCard,
  clampText,
  clampTitle,
  titleFontSize,
  titleUnits,
} from '@/components/og/social-card';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  isFetchableImageUrl,
  loadImageDataUri,
  loadPictureDataUri,
  renderSocialCard,
} from './social-card-render';

const PUBLIC = async () => ['93.184.216.34'];

const PNG_1x1 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zx9QAAAAASUVORK5CYII=',
  ),
  (c) => c.charCodeAt(0),
);
const fakeFetch = (body: BodyInit, type: string, status = 200) =>
  vi.fn(
    async () =>
      new Response(body, { status, headers: { 'content-type': type } }),
  ) as unknown as typeof fetch;

describe('clampText / titleFontSize (Review Focus 2)', () => {
  it('leaves short text alone and clamps long text with an ellipsis', () => {
    expect(clampText('short', 10)).toBe('short');
    expect(clampText('a'.repeat(300), 90)).toHaveLength(90);
    expect(clampText('a'.repeat(300), 90).endsWith('…')).toBe(true);
  });
  it('does not split a surrogate pair (emoji)', () => {
    const out = clampText('🌸'.repeat(200), 50);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/[\uD800-\uDBFF]…$/);
  });
  it('steps the title size down', () => {
    expect(titleFontSize('a'.repeat(20))).toBe(72);
    expect(titleFontSize('a'.repeat(50))).toBe(60);
    expect(titleFontSize('a'.repeat(80))).toBe(50);
  });
});

describe('loadImageDataUri (Review Focus 3)', () => {
  it('returns a data uri for png', async () => {
    const uri = await loadImageDataUri('https://x/l.png', {
      fetchImpl: fakeFetch(PNG_1x1, 'image/png'),
      resolve: PUBLIC,
    });
    expect(uri).toMatch(/^data:image\/png;base64,/);
  });
  it.each([
    ['null url', null, fakeFetch(PNG_1x1, 'image/png')],
    ['emoji', '🌸', fakeFetch(PNG_1x1, 'image/png')],
    ['relative path', '/assets/logo.png', fakeFetch(PNG_1x1, 'image/png')],
    ['webp', 'https://x/l.webp', fakeFetch(PNG_1x1, 'image/webp')],
    ['404', 'https://x/l.png', fakeFetch('nope', 'text/html', 404)],
    [
      'too big',
      'https://x/l.png',
      fakeFetch(new Uint8Array(3_000_000), 'image/png'),
    ],
  ])('returns null for %s', async (_n, url, fetchImpl) => {
    expect(
      await loadImageDataUri(url as string | null, { fetchImpl }),
    ).toBeNull();
  });
  it('returns null on timeout', async () => {
    const slow = vi.fn(
      (_u: string, init?: RequestInit) =>
        new Promise<Response>((_res, rej) =>
          init?.signal?.addEventListener('abort', () =>
            rej(new Error('aborted')),
          ),
        ),
    ) as unknown as typeof fetch;
    expect(
      await loadImageDataUri('https://x/l.png', {
        fetchImpl: slow,
        resolve: PUBLIC,
        timeoutMs: 20,
      }),
    ).toBeNull();
  });
});

describe('isFetchableImageUrl (SSRF guard)', () => {
  const ok = (u: string, resolve = PUBLIC) =>
    isFetchableImageUrl(u, { resolve });
  it.each([
    'https://127.0.0.1/a.png',
    'https://10.1.2.3/a.png',
    'https://172.16.0.1/a.png',
    'https://172.31.255.255/a.png',
    'https://192.168.1.1/a.png',
    'https://169.254.169.254/latest',
    'https://100.64.0.1/a.png',
    'https://0.0.0.0/a.png',
    'https://[::1]/a.png',
    'https://[::]/a.png',
    'https://[fc00::1]/a.png',
    'https://[fd12:3456::1]/a.png',
    'https://[fe80::1]/a.png',
    'https://[::ffff:127.0.0.1]/a.png',
    'https://[::ffff:10.0.0.1]/a.png',
    'https://localhost/a.png',
    'https://foo.localhost/a.png',
    'https://printer.local/a.png',
    'https://db.internal/a.png',
  ])('rejects %s', async (u) => {
    expect(await ok(u)).toBe(false);
  });
  it('accepts public hosts and ips', async () => {
    expect(await ok('https://cdn.example.com/a.png')).toBe(true);
    expect(await ok('https://8.8.8.8/a.png')).toBe(true);
    expect(await ok('https://172.32.0.1/a.png')).toBe(true);
  });
  it('rejects http in production, allows it in dev', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(await ok('http://cdn.example.com/a.png')).toBe(false);
    vi.stubEnv('NODE_ENV', 'development');
    expect(await ok('http://cdn.example.com/a.png')).toBe(true);
    vi.unstubAllEnvs();
  });
  it('rejects a hostname resolving to a private address (any of several)', async () => {
    expect(
      await ok('https://evil.example/a.png', async () => ['10.0.0.1']),
    ).toBe(false);
    expect(
      await ok('https://evil.example/a.png', async () => [
        '8.8.8.8',
        '10.0.0.1',
      ]),
    ).toBe(false);
    expect(await ok('https://evil.example/a.png', async () => [])).toBe(false);
  });
  it('rejects redirects to private hosts and follows public ones', async () => {
    const redirect = (loc: string) =>
      vi.fn(async (u: string) =>
        u === 'https://cdn.example.com/l.png'
          ? new Response(null, { status: 302, headers: { location: loc } })
          : new Response(PNG_1x1, {
              status: 200,
              headers: { 'content-type': 'image/png' },
            }),
      ) as unknown as typeof fetch;
    expect(
      await loadImageDataUri('https://cdn.example.com/l.png', {
        fetchImpl: redirect('http://127.0.0.1/x.png'),
        resolve: PUBLIC,
      }),
    ).toBeNull();
    expect(
      await loadImageDataUri('https://cdn.example.com/l.png', {
        fetchImpl: redirect('https://r2.example.net/x.png'),
        resolve: PUBLIC,
      }),
    ).toMatch(/^data:image\/png;base64,/);
  });
  it('gives up after 3 redirects', async () => {
    const loop = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://cdn.example.com/l.png' },
        }),
    ) as unknown as typeof fetch;
    expect(
      await loadImageDataUri('https://cdn.example.com/l.png', {
        fetchImpl: loop,
        resolve: PUBLIC,
      }),
    ).toBeNull();
    expect(loop).toHaveBeenCalledTimes(4);
  });
  it('rejects early on a large content-length', async () => {
    const f = vi.fn(
      async () =>
        new Response(PNG_1x1, {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '9999999' },
        }),
    ) as unknown as typeof fetch;
    expect(
      await loadImageDataUri('https://cdn.example.com/l.png', {
        fetchImpl: f,
        resolve: PUBLIC,
      }),
    ).toBeNull();
  });
});

const photo = (width: number, height: number, format: 'png' | 'webp' = 'png') =>
  sharp({
    create: { width, height, channels: 3, background: '#7a9e7e' },
  })
    .toFormat(format)
    .toBuffer();

const jpegSize = async (buf: ArrayBuffer | Buffer) => {
  const meta = await sharp(Buffer.from(buf as ArrayBuffer)).metadata();
  return { format: meta.format, width: meta.width, height: meta.height };
};

describe('loadPictureDataUri', () => {
  const site = { src: 'https://g.test/a.png', sitePath: 'a.png' };

  it('reads a site file from storage and crops it to the column as jpeg', async () => {
    const readSiteFile = vi.fn(async () => photo(1024, 1024));
    const uri = await loadPictureDataUri(site, { readSiteFile });
    expect(readSiteFile).toHaveBeenCalledWith('a.png', expect.any(Number));
    expect(uri).toMatch(/^data:image\/jpeg;base64,/);
    const buf = Buffer.from(uri!.split(',')[1]!, 'base64');
    expect(await jpegSize(buf)).toEqual({
      format: 'jpeg',
      width: 520,
      height: 630,
    });
  });

  it('fetches an external webp through the guard and converts it', async () => {
    const uri = await loadPictureDataUri(
      { src: 'https://cdn.example.com/p.webp', sitePath: null },
      {
        readSiteFile: vi.fn(),
        fetchImpl: fakeFetch(
          new Uint8Array(await photo(1200, 800, 'webp')),
          'image/webp',
        ),
        resolve: PUBLIC,
      },
    );
    expect(uri).toMatch(/^data:image\/jpeg;base64,/);
  });

  it.each([
    ['a missing site file', async () => null],
    ['a corrupt site file', async () => Buffer.from('not an image')],
  ])('returns null for %s', async (_n, readSiteFile) => {
    expect(await loadPictureDataUri(site, { readSiteFile })).toBeNull();
  });

  it('returns null for an external image on a private host', async () => {
    expect(
      await loadPictureDataUri(
        { src: 'https://cdn.example.com/p.png', sitePath: null },
        {
          readSiteFile: vi.fn(),
          fetchImpl: fakeFetch(
            new Uint8Array(await photo(800, 800)),
            'image/png',
          ),
          resolve: async () => ['10.0.0.1'],
        },
      ),
    ).toBeNull();
  });
});

describe('SocialCard layouts', () => {
  const props = {
    siteName: 'S',
    logoSrc: null,
    title: '数'.repeat(300),
    section: 'Blog',
    domain: 'garden.test',
    showMark: true,
    markSrc: 'data:image/png;base64,AA==',
  };
  const text = (node: any): string[] =>
    node == null || typeof node === 'boolean'
      ? []
      : typeof node === 'string'
        ? [node]
        : Array.isArray(node)
          ? node.flatMap(text)
          : typeof node.type === 'function'
            ? text(node.type(node.props))
            : text(node.props?.children);

  it('card C (no picture) clamps the title and shows label, wordmark and domain', () => {
    const shown = text(SocialCard({ ...props, pictureSrc: null }));
    expect(shown).toContain('Blog');
    expect(shown).toContain('S');
    expect(shown).toContain('garden.test');
    const title = shown.find((s) => s.startsWith('数'))!;
    expect(title.endsWith('…')).toBe(true);
    expect(titleUnits(title)).toBeLessThanOrEqual(84);
  });

  it('counts wide characters double when clamping titles', () => {
    expect(clampTitle('a'.repeat(84))).toBe('a'.repeat(84));
    expect(Array.from(clampTitle('a'.repeat(200)))).toHaveLength(84);
    expect(Array.from(clampTitle('数'.repeat(200)))).toHaveLength(42); // 41 + …
    expect(titleFontSize('数'.repeat(30))).toBe(50);
  });

  it('card A draws the picture in the left column', () => {
    const tree = SocialCard({ ...props, pictureSrc: 'data:x' }) as any;
    const card = tree.type(tree.props);
    expect(card.props.children[0].props).toMatchObject({
      src: 'data:x',
      width: 520,
      height: 630,
    });
  });
});

describe('renderSocialCard', () => {
  const inputs = {
    siteName: 'Ana’s Garden',
    logo: null,
    showMark: true,
    image: null,
    page: {
      title: 'Why I moved my notes to a public digital garden',
      section: 'Notes',
      sha: 'a',
    },
  };
  const readSiteFile = vi.fn(async () => photo(1200, 800));
  const render = (over: object, domain = 'notes-ana.flowershow.me') =>
    renderSocialCard({ ...inputs, ...over }, domain, { readSiteFile });
  const isCard = async (card: { body: ArrayBuffer }) =>
    expect(await jpegSize(card.body)).toEqual({
      format: 'jpeg',
      width: 1200,
      height: 630,
    });

  it('renders a complete 1200x630 jpeg for a page, a site card and a picture card', async () => {
    for (const card of [
      await render({}),
      await render({ page: null }),
      await render({
        image: { src: 'https://g.test/a.png', sitePath: 'a.png' },
      }),
    ]) {
      await isCard(card);
      expect(card.complete).toBe(true);
    }
  }, 30_000);

  it('falls back to the text card, marked incomplete, when the picture cannot be read', async () => {
    const missing = vi.fn(async () => null);
    const card = await renderSocialCard(
      {
        ...inputs,
        image: { src: 'https://g.test/a.png', sitePath: 'gone.png' },
      },
      'x',
      { readSiteFile: missing },
    );
    await isCard(card);
    expect(card.complete).toBe(false);
  }, 20_000);

  it('a relative or emoji logo is not a failure; an unreachable logo URL is', async () => {
    expect((await render({ logo: '/assets/logo.png' })).complete).toBe(true);
    expect((await render({ logo: 'https://127.0.0.1/l.png' })).complete).toBe(
      false,
    );
  }, 20_000);

  it('renders pathological titles without throwing', async () => {
    for (const title of [
      'h'.repeat(400),
      '数字花园的笔记与想法'.repeat(10),
      '🌸🌼🌻'.repeat(30),
    ]) {
      await isCard(await render({ page: { ...inputs.page, title } }, 'x'));
    }
  }, 60_000);

  it('renders samples (saved for visual review)', async () => {
    const dir = process.env.SOCIAL_SAMPLE_DIR;
    const samples = {
      'card-a': await render({
        image: { src: 'https://g.test/a.png', sitePath: 'a.png' },
      }),
      'card-c': await render({}),
      'card-c-site': await render({ page: null }),
      'card-c-worst': await render({
        page: { ...inputs.page, title: '数'.repeat(300) },
      }),
    };
    for (const buf of Object.values(samples)) await isCard(buf);
    if (dir)
      for (const [name, buf] of Object.entries(samples))
        writeFileSync(join(dir, `${name}.jpg`), Buffer.from(buf.body));
  }, 60_000);
});
