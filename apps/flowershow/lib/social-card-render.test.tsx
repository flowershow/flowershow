// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  SocialCard,
  clampText,
  titleFontSize,
} from '@/components/og/social-card';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isFetchableImageUrl,
  loadImageDataUri,
  renderSocialCardPng,
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
    expect(titleFontSize('a'.repeat(30))).toBe(76);
    expect(titleFontSize('a'.repeat(50))).toBe(64);
    expect(titleFontSize('a'.repeat(80))).toBe(54);
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

describe('SocialCard layout bounds', () => {
  it('bounds the middle column so it cannot push the footer off-card', () => {
    const tree = SocialCard({
      siteName: 'S',
      logoSrc: null,
      title: '数'.repeat(300),
      description: 'x'.repeat(400),
      displayUrl: 'u',
      showMark: true,
      markSrc: 'data:image/png;base64,AA==',
    }) as any;
    const column = tree.props.children[1].props.children[1];
    expect(column.props.style.overflow).toBe('hidden');
    expect(column.props.style.maxHeight).toBeLessThanOrEqual(400);
    const title = column.props.children[0].props.children as string;
    expect(Array.from(title)).toHaveLength(90);
    expect(
      Array.from(column.props.children[1].props.children as string),
    ).toHaveLength(120);
  });
});

describe('renderSocialCardPng', () => {
  const inputs = {
    siteName: 'Ana’s Garden',
    siteDescription: 'Notes',
    logo: null,
    showMark: true,
    page: {
      title: 'Why I moved my notes to a public digital garden',
      description: 'Last spring…',
      sha: 'a',
    },
  };
  const isPng1200x630 = (buf: ArrayBuffer) => {
    const v = new DataView(buf);
    return (
      v.getUint32(0) === 0x89504e47 &&
      v.getUint32(16) === 1200 &&
      v.getUint32(20) === 630
    );
  };

  it('renders a 1200x630 png for a page', async () => {
    expect(
      isPng1200x630(
        await renderSocialCardPng(inputs, 'notes-ana.flowershow.me/x'),
      ),
    ).toBe(true);
  }, 20_000);

  it('renders the site-only card and pathological titles without throwing', async () => {
    expect(
      isPng1200x630(
        await renderSocialCardPng(
          { ...inputs, page: null },
          'notes-ana.flowershow.me',
        ),
      ),
    ).toBe(true);
    for (const title of [
      'h'.repeat(400),
      '数字花园的笔记与想法'.repeat(10),
      '🌸🌼🌻'.repeat(30),
    ]) {
      expect(
        isPng1200x630(
          await renderSocialCardPng(
            { ...inputs, page: { ...inputs.page, title } },
            'x',
          ),
        ),
      ).toBe(true);
    }
  }, 60_000);

  it('renders worst-case and CJK samples (saved for visual review)', async () => {
    const dir = process.env.SOCIAL_SAMPLE_DIR;
    const worst = await renderSocialCardPng(
      {
        ...inputs,
        page: {
          ...inputs.page,
          title: '数'.repeat(300),
          description: 'Ｗ'.repeat(300),
        },
      },
      'notes-ana.flowershow.me/x',
    );
    const cjk = await renderSocialCardPng(
      { ...inputs, page: { ...inputs.page, title: '数字花园的笔记与想法' } },
      'notes-ana.flowershow.me/x',
    );
    expect(isPng1200x630(worst)).toBe(true);
    expect(isPng1200x630(cjk)).toBe(true);
    if (dir) {
      writeFileSync(join(dir, 'task-6-sample-worst.png'), Buffer.from(worst));
      writeFileSync(join(dir, 'task-6-sample-cjk.png'), Buffer.from(cjk));
    }
  }, 30_000);
});
