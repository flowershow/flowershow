/**
 * Dry run of the e2e listings fixture without a database or Next server: each
 * URL goes through the same route resolver, plugin, renderer and page shell as
 * SitePage, over e2e/fixtures/listings-demo parsed like the e2e seed. Writes
 * apps/flowershow/.listing-preview/demo/<name>.html and prints what the e2e
 * spec (e2e/specs/listings.spec.ts) asserts, so fixture data can be checked
 * before CI. `.mdx` pages go through the .md pipeline here (approximation:
 * inline MDX blocks are covered by lib/markdown-listing.test.tsx).
 *
 *   pnpm preview:listings:demo
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

vi.mock('@/server/db', async () => {
  const { buildDemoSite } = await import('./demo-site');
  const { fakeDb } = await import('./fixtures');
  const db = fakeDb((await buildDemoSite()).rows);
  return { default: db, db };
});
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
vi.mock('@/trpc/react', () => ({ api: {} }));
vi.mock('@/trpc/server', () => ({ api: {} }));
vi.mock('next/image', () => ({
  // biome-ignore lint/a11y/useAltText: alt is passed through
  default: ({ fill: _f, priority: _p, ...p }: Record<string, any>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- alt is passed through
    <img {...p} />
  ),
}));

import { BlogLayout } from '@/components/public/layouts/blog';
import { ListingPage } from '@/components/public/listing/listing-page';
import { VirtualListingPage } from '@/components/public/listing/virtual-listing-page';
import { renderPageListing } from '@/lib/listing/page-listing';
import {
  hasIntroText,
  listingFeedUrl,
  resolveListingRoute,
} from '@/lib/listing/route';
import { processMarkdown } from '@/lib/markdown';
import { buildDemoSite } from './demo-site';

const OUT = path.resolve(__dirname, '../../.listing-preview/demo');
const HOST = 'e2e-listings.local';
const URLS: Array<[name: string, slug: string, page?: number]> = [
  ['blog', '/blog'],
  ['blog-page-2', '/blog', 2],
  ['blog-page-99', '/blog', 99],
  ['home', '/'],
  ['projects', '/projects'],
  ['podcast', '/podcast'],
  ['archive', '/archive'],
  ['archive-page-5', '/archive', 5],
  ['errors', '/errors'],
  ['two-paginated', '/two-paginated'],
  ['posts', '/posts'],
  ['notes-blog', '/notes/blog'],
  ['notes-posts', '/notes/posts'],
  ['limit-note', '/limit-note'],
  ['writing-blog', '/writing/blog'],
  ['garden-blog', '/garden/blog'],
  ['mdx-posts', '/mdx/posts'],
  ['case', '/case'],
  ['nested', '/nested'],
  ['mdx-page', '/mdx-page'],
  ['mdx-people', '/mdx-people'],
  ['thumb-right', '/thumb-right'],
  ['default-image', '/default-image'],
  ['no-monogram', '/no-monogram'],
  ['text-grid', '/text-grid'],
  ['compact-teaser', '/compact-teaser'],
  ['by-month', '/by-month'],
  ['people', '/people'],
  ['team', '/team'],
  ['team-file', '/team-file'],
  ['magazine', '/magazine'],
  ['magazine-page-2', '/magazine', 2],
  ['magazine-view', '/magazine-view'],
  ['magazine-view-page-2', '/magazine-view', 2],
  ['magazine-view-page-3', '/magazine-view', 3],
  ['magazine-small', '/magazine-small'],
  ['mdx-magazine', '/mdx-magazine'],
  ['latest-hero', '/latest-hero'],
  ['inline-paginated-page-2', '/inline-paginated', 2],
  ['inline-paginated-page-99', '/inline-paginated', 99],
];

it('renders the e2e listings fixture', async () => {
  const site = await buildDemoSite();
  mkdirSync(OUT, { recursive: true });
  const report: Record<string, unknown> = {};
  for (const [name, slug, pageNo = 1] of URLS) {
    const row = site.rows.find((r) => r.appPath === slug) ?? null;
    const metadata = (row?.metadata ?? null) as Record<string, any> | null;
    const route = resolveListingRoute({
      slug,
      blob: row ? { path: row.path } : null,
      metadata,
      content: row?.content ?? '',
      siteFilePaths: site.files,
      changelogKind: null,
    });
    // As SitePage: the paginating listing reports its page; past the last one is a 404
    let paginated: { page: number; pageCount: number } | undefined;
    const onPaginate = (info: { page: number; pageCount: number }) => {
      paginated = info;
    };
    const common = {
      onPaginate,
      site: { id: 'demo' },
      siteHostname: HOST,
      siteFilePaths: site.files,
      permalinks: {},
      page: pageNo,
      locale: 'en-US',
      publicUrl: slug,
    };
    let body: React.ReactElement;
    if (route.kind === 'virtual') {
      const listing = await renderPageListing({
        ...common,
        filePath: `${route.dir}/index.md`,
        route,
      });
      body = (
        <VirtualListingPage
          title={route.title}
          listing={listing}
          view="list"
          feedUrl={listingFeedUrl(route, true)}
        />
      );
    } else {
      expect(row, `${slug}: no page and no zero-config folder`).not.toBeNull();
      const content = await processMarkdown(row!.content, {
        files: site.files,
        filePath: row!.path,
        siteHostname: HOST,
        siteId: 'demo',
        permalinks: {},
        listing: {
          page: pageNo,
          publicUrl: slug,
          locale: 'en-US',
          paginationClaimed: route.kind === 'page' && route.pageSize != null,
          onPaginate,
        },
      });
      const pageListing =
        route.kind === 'page'
          ? await renderPageListing({
              ...common,
              filePath: row!.path,
              route,
              pageTitle: metadata?.title,
            })
          : null;
      // Same shells as SitePage (the demo site has RSS on)
      body =
        route.kind === 'page' ? (
          <ListingPage
            title={metadata?.title ?? ''}
            view={route.view}
            feedUrl={listingFeedUrl(route, true)}
            intro={content}
            hasIntro={hasIntroText(row!.content)}
            listing={pageListing}
          />
        ) : (
          <BlogLayout title={metadata?.title ?? ''}>
            <div className="rendered-mdx" id="mdxpage">
              {content}
            </div>
          </BlogLayout>
        );
    }
    const html = renderToStaticMarkup(
      <main className="page-main">{body}</main>,
    );
    writeFileSync(path.join(OUT, `${name}.html`), html);
    const doc = new JSDOM(html).window.document;
    const texts = (sel: string) =>
      [...doc.querySelectorAll(sel)].map((e) => e.textContent?.trim());
    const outOfRange = isPastLastPage(paginated);
    report[`${name}${pageNo > 1 ? `?page=${pageNo}` : ''}`] = {
      route: route.kind,
      outOfRange,
      lists: doc.querySelectorAll('section.list-component').length,
      items: texts(
        'section.list-component > article .list-component-item-headline a',
      ),
      pages: texts('.list-component-pagination-pages > *'),
      view: doc
        .querySelector('section.list-component')
        ?.getAttribute('data-view'),
      groups: texts('h2.list-component-group-heading'),
      groupIds: doc.querySelectorAll('h2.list-component-group-heading[id]')
        .length,
      featured: texts(
        '.list-component-item--featured .list-component-item-headline a',
      ),
      featuredMedia: doc.querySelectorAll(
        '.list-component-item--featured .list-component-item-media',
      ).length,
      initials: texts('.list-component-item-initials'),
      meta: texts('.list-component-item-meta-value'),
      eyebrows: texts('.list-component-item-eyebrow').slice(0, 3),
      dates: texts('.list-component-item-date').slice(0, 3),
      errors: texts('.list-component-error--block'),
      placeholders: doc.querySelectorAll(
        '.list-component-item-media--placeholder',
      ).length,
      media: doc.querySelectorAll('.list-component-item-media img').length,
      side: doc
        .querySelector('section.list-component')
        ?.getAttribute('data-media-side'),
      lastChild: doc.querySelector('#mdxpage > :last-child')?.className,
      notes: [...doc.querySelectorAll('[data-listing-notes]')].map((e) =>
        e.getAttribute('data-listing-notes'),
      ),
      hrefs: [
        ...doc.querySelectorAll('nav.list-component-pagination a[href]'),
      ].map((a) => a.getAttribute('href')),
      authors: [...doc.querySelectorAll('.list-component-item-author')]
        .slice(0, 6)
        .map(
          (a) =>
            `${a.tagName}:${a.getAttribute('href') ?? ''}:${a.textContent}`,
        ),
    };
  }
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`demo dry run → ${OUT}/report.json`);
});

function isPastLastPage(p?: { page: number; pageCount: number }): boolean {
  return p !== undefined && p.page > p.pageCount;
}
