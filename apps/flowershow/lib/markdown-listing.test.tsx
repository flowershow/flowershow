import { hydrate } from 'next-mdx-remote-client/csr';
import { serialize } from 'next-mdx-remote-client/serialize';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
vi.mock('@/trpc/react', () => ({ api: {} })); // pulled in by the legacy List via the factory
vi.mock('@/components/public/mdx/mdx-client-components', () => ({
  Mermaid: () => null,
  ObsidianBasesViews: () => null,
  PdfViewer: () => null,
  CustomHtml: () => null,
  FlatUiTable: () => null,
  LineChart: () => null,
  Plotly: () => null,
  PlotlyBarChart: () => null,
  PlotlyLineChart: () => null,
  Vega: () => null,
}));
vi.mock('@/components/public/mdx/listing-image', () => ({
  default: (p: Record<string, string>) => (
    <span
      data-testid="listing-image"
      data-src={p.src}
      data-variant={p.variant}
      data-sizes={p.sizes}
    />
  ),
}));
const ROWS = [
  {
    id: '1',
    path: 'blog/intro.md',
    appPath: '/blog/intro',
    permalink: null,
    metadata: {
      title: 'Intro',
      date: '2026-09-18',
      description: 'First',
      image: 'https://x.org/a.jpg',
      authors: ['ada'],
      category: 'Themes',
      guests: ['[[people/ada|Ada Lovelace]]'],
    },
  },
  {
    id: '2',
    path: 'blog/two.md',
    appPath: '/blog/two',
    permalink: null,
    metadata: { title: 'Two', date: '2026-09-17' },
  },
  // eight more, so a magazine block fills its top section and has rest rows
  ...Array.from({ length: 8 }, (_, i) => ({
    id: String(i + 3),
    path: `blog/p${i + 3}.md`,
    appPath: `/blog/p${i + 3}`,
    permalink: null,
    metadata: {
      title: `Post ${i + 3}`,
      date: `2026-09-0${9 - i}`,
      authors: ['ada'],
      ...(i % 2 ? { image: 'https://x.org/b.jpg' } : {}),
    },
  })),
];
vi.mock('@/lib/listing/query', () => ({
  queryListingIndex: async () => ({
    ids: ROWS.map((r) => r.id),
    paths: ROWS.map((r) => r.path),
    featured: [],
    groups: null,
  }),
  fetchRowsByIds: async (_db: unknown, _s: string, ids: string[]) =>
    ROWS.filter((r) => ids.includes(r.id)),
}));
vi.mock('@/lib/listing/authors', () => ({
  cachedResolveAuthors: async () => [
    {
      key: 'b',
      name: 'Ada Lovelace',
      url: '/people/ada',
      avatar: 'https://x.org/ada.jpg',
    },
  ],
}));

import { mdxComponentsFactory } from '@/components/public/mdx/mdx-components-factory';
import {
  getMdxOptions,
  processMarkdown,
  protectNonMathDollars,
  protectWikiLinkAliases,
} from './markdown';

// `pageSize: 1` gives 2 pages (pagination + SVG icons); `fields` exercises the eyebrow and a wiki alias in meta.
const SRC =
  '## Intro\n\n```blog\npageSize: 1\nfields:\n  eyebrow: category\n  meta: [guests]\n```\n\n## Outro\n';
const opts = {
  filePath: 'README.md',
  files: ['/blog/intro.md', '/people/ada.md'],
  siteHostname: 'h.site',
  siteId: 's',
  listing: { page: 1, publicUrl: '/' },
};

async function md(src = SRC) {
  return renderToStaticMarkup(await processMarkdown(src, opts));
}
async function mdx(src = SRC) {
  const result = await serialize({
    source: protectNonMathDollars(protectWikiLinkAliases(src)),
    options: getMdxOptions(opts) as any,
  });
  if ('error' in result) throw result.error;
  const components = mdxComponentsFactory({
    blob: { path: 'README.md' } as any,
    site: { id: 's', subdomain: 'h', customDomain: null } as any,
  });
  const { content, error } = hydrate({ ...result, components });
  if (error) throw error;
  return renderToStaticMarkup(content);
}
const section = (html: string) =>
  new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector('section.list-component')!;
/** Attribute order may differ between pipelines; nothing else may. */
function canonical(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    const attrs = [...node.attributes]
      .map((a) => [a.name, a.value] as const)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    for (const [n] of attrs) node.removeAttribute(n);
    for (const [n, v] of attrs) node.setAttribute(n, v);
  }
  return clone.outerHTML.replace(/>\s+</g, '><').trim();
}

describe('list blocks: .md and .mdx render the same listing', () => {
  it('same HTML for the listing section', async () => {
    expect(canonical(section(await md()))).toBe(
      canonical(section(await mdx())),
    );
  });
  it('same HTML for a magazine block (hero, cards, briefs, section headings, rest rows)', async () => {
    const src = '## Intro\n\n```blog\nview: magazine\n```\n\n## Recent posts\n';
    for (const render of [md, mdx]) {
      const doc = new DOMParser().parseFromString(
        await render(src),
        'text/html',
      );
      const s = doc.querySelector('section.list-component')!;
      expect(
        s
          .querySelector('.list-component-magazine-top')!
          .getAttribute('data-layout'),
      ).toBe('full');
      expect(s.querySelectorAll('.list-component-item--card')).toHaveLength(2);
      expect(s.querySelectorAll('.list-component-item--brief')).toHaveLength(5);
      expect(
        s.querySelectorAll('.list-component-magazine-rest > article'),
      ).toHaveLength(2);
      expect(
        [...s.querySelectorAll('h2.list-component-section-heading')].map(
          (h) => h.textContent,
        ),
      ).toEqual(['More posts', 'Recent posts']);
      // no ids or anchors on listing headings; the page's own heading keeps its slug
      expect(s.querySelectorAll('[id], .heading-link')).toHaveLength(0);
      expect(doc.querySelector('h2#recent-posts')).not.toBeNull();
    }
    expect(canonical(section(await md(src)))).toBe(
      canonical(section(await mdx(src))),
    );
  });
  for (const [name, render] of [
    ['md', md],
    ['mdx', mdx],
  ] as const) {
    it(`${name}: ListingImage resolves to the component (media and avatar)`, async () => {
      const s = section(await render());
      expect(
        s.querySelector(
          '[data-testid="listing-image"][data-variant="media"][data-src="https://x.org/a.jpg"]',
        ),
      ).not.toBeNull();
      expect(
        s.querySelector('[data-testid="listing-image"][data-variant="avatar"]'),
      ).not.toBeNull();
      expect(s.querySelector('listingimage, ListingImage')).toBeNull();
    });
    it(`${name}: pagination svg keeps its viewBox; string props survive`, async () => {
      const s = section(await render());
      expect(s.querySelector('svg[viewBox="0 0 24 24"]')).not.toBeNull();
      expect(
        s
          .querySelector('a.list-component-item-media-link')!
          .getAttribute('tabindex'),
      ).toBe('-1');
      expect(s.querySelector('h3')!.getAttribute('data-toc-ignore')).toBe('');
    });
    it(`${name}: item headings have no id, no .heading-link, and do not shift real slugs`, async () => {
      const doc = new DOMParser().parseFromString(await render(), 'text/html');
      const s = doc.querySelector('section.list-component')!;
      expect(s.querySelectorAll('.heading-link')).toHaveLength(0);
      expect(
        s.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]'),
      ).toHaveLength(0);
      expect(s.querySelector('h3[data-toc-ignore]')).not.toBeNull();
      expect(doc.querySelector('h2#intro')).not.toBeNull(); // the post titled "Intro" must not make this #intro-1
    });
    it(`${name}: wiki aliases inside frontmatter fields render as links`, async () => {
      expect(
        section(await render()).querySelector(
          '[data-field="guests"] a[href="/people/ada"]',
        )!.textContent,
      ).toBe('Ada Lovelace');
    });
  }
});
