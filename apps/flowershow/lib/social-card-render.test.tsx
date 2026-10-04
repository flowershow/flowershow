// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { clampText, titleFontSize } from '@/components/og/social-card';
import { loadImageDataUri, renderSocialCardPng } from './social-card-render';

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
    expect(clampText('a'.repeat(300), 110)).toHaveLength(110);
    expect(clampText('a'.repeat(300), 110).endsWith('…')).toBe(true);
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
        timeoutMs: 20,
      }),
    ).toBeNull();
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
});
