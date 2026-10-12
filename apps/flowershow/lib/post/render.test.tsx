import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/image', () => ({
  default: ({ fill: _f, ...p }: Record<string, unknown>) => (
    // biome-ignore lint/a11y/useAltText: alt is passed through
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...(p as object)} />
  ),
}));
import type { ListingItem } from '@/lib/listing/items';
import { collectionSpecs } from './footer';
import { renderReadMoreCards } from './render';

const item = (n: number, image: string | null): ListingItem => ({
  path: `blog/p${n}.md`,
  url: `/blog/p${n}`,
  title: `Post ${n}`,
  date: `2026-0${n}-01`,
  dateInEyebrow: false,
  summary: `Summary ${n}`,
  image,
  authorHandles: ['ann'],
  eyebrow: [],
  meta: [],
  group: null,
});
const { cards } = collectionSpecs({
  dir: 'blog',
  options: undefined,
  source: 'auto',
  hostPath: null,
});

describe('renderReadMoreCards', () => {
  it('renders the listing grid cards, headings without ids, images through ListingImage', async () => {
    const el = await renderReadMoreCards({
      items: [item(1, 'http://s/a.png'), item(2, null), item(3, null)],
      spec: cards,
      authors: new Map([
        ['ann', { key: 'ann', name: 'Ann', url: '/people/ann' }],
      ]),
      locale: 'en-US',
    });
    const html = renderToStaticMarkup(el!);
    expect(html).toContain(
      'class="list-component list-component--grid not-prose" data-view="grid" data-media="cover" data-ratio="16-9"',
    );
    expect(html.match(/<article class="list-component-item"/g)).toHaveLength(3);
    expect(html).toContain('<img class="list-component-item-media-img"');
    expect(html).toContain('list-component-item-monogram');
    expect(html).not.toMatch(/<h3[^>]* id=/);
    expect(html).toContain(
      '<a class="list-component-item-author" href="/people/ann">Ann</a>',
    );
    expect(html).not.toContain('list-component-pagination');
  });
  it('renders nothing without items', async () => {
    expect(
      await renderReadMoreCards({
        items: [],
        spec: cards,
        authors: new Map(),
        locale: 'en-US',
      }),
    ).toBeNull();
  });
});
