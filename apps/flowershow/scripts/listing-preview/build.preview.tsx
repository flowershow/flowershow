/**
 * Builds the static listing preview: every scenario in scenarios.ts goes
 * through the real route resolver, remark plugin, renderer and page shell
 * (BlogLayout / VirtualListingPage), with an in-memory site instead of Prisma.
 * Output: apps/flowershow/.listing-preview/ (gitignored), index.html gallery.
 *
 *   npx vitest run --config scripts/listing-preview/vitest.config.mts
 *
 * Runs under vitest only for its module mocking and path aliases; it is not
 * part of the unit suite.
 */
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import {
  ASSETS,
  buildSite,
  CONTENT_DIR,
  fakeDb,
  SITE_HOSTNAME,
} from './fixtures';
import { SCENARIOS, type Scenario, THEMES } from './scenarios';

const site = buildSite();

vi.mock('@/server/db', async () => {
  const { buildSite: b, fakeDb: f } = await import('./fixtures');
  const db = f(b().rows);
  return { default: db, db };
});
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
// The legacy <List /> fetches through tRPC on the client; serve it the fixture rows.
vi.mock('@/trpc/react', async () => {
  const { buildSite: b } = await import('./fixtures');
  const rows = b().rows;
  return {
    api: {
      site: {
        getListComponentItems: {
          useQuery: ({ dir }: { dir: string }) => {
            const d = dir.replace(/^\/+/, '');
            const items = rows
              .filter(
                (r) =>
                  r.path.startsWith(`${d}/`) && !/README\.md$/.test(r.path),
              )
              .sort((a, b) =>
                String(b.metadata.date ?? '').localeCompare(
                  String(a.metadata.date ?? ''),
                ),
              )
              .map((r) => ({
                url: r.appPath,
                metadata: {
                  ...r.metadata,
                  image:
                    typeof r.metadata.image === 'string'
                      ? r.metadata.image.replace(
                          /^\[\[(.*)\]\]$/,
                          `http://${'preview.flowershow.local'}/$1`,
                        )
                      : undefined,
                },
              }));
            return { data: { items }, isLoading: false, error: null };
          },
        },
      },
    },
  };
});
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/blog',
  useRouter: () => ({ push: () => {} }),
}));
vi.mock('@/trpc/server', () => ({ api: {} }));
/** next/image without a Next server: the <img> it renders, minus the optimiser URL. */
vi.mock('next/image', () => ({
  default: ({ fill, style, priority: _p, ...p }: Record<string, any>) => {
    const fillStyle = fill
      ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
      : {};
    // biome-ignore lint/a11y/useAltText: alt is passed through
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- alt is passed through
    return <img {...p} style={{ ...fillStyle, ...style }} />;
  },
}));

import { imageSize } from 'image-size';
import { BlogLayout } from '@/components/public/layouts/blog';
import { PostLayout } from '@/components/public/layouts/post';
import { PostFooterSection } from '@/components/public/layouts/post-footer';
import { resolveAuthors } from '@/lib/listing/authors';
import { pageHeaderBreadcrumbs } from '@/lib/breadcrumbs';
import { resolvePostHero } from '@/lib/post/hero';
import { loadDatedShares } from '@/lib/post/hosts';
import {
  datedShareDirs,
  postFiles,
  postHostPaths,
  resolvePostRoute,
} from '@/lib/post/route';
import { frontmatterTags } from '@flowershow/core';
import List from '@/components/public/mdx/list';
import { ListingPage } from '@/components/public/listing/listing-page';
import { VirtualListingPage } from '@/components/public/listing/virtual-listing-page';
import { renderPageListing } from '@/lib/listing/page-listing';
import { listingFeedUrl, resolveListingRoute } from '@/lib/listing/route';
import { processMarkdown } from '@/lib/markdown';

const APP = path.resolve(__dirname, '../..');
const OUT = path.join(APP, '.listing-preview');
const THEMES_DIR =
  process.env.THEMES_DIR ?? path.resolve(APP, '../../../themes');
const LOCALE = 'en-US';
/** The preview site has RSS on, so listing headers show their feed link. */
const PREVIEW_RSS = true;

/** Intrinsic sizes of the copied assets, keyed like the site's image-dimensions map. */
const DIMENSIONS = Object.fromEntries(
  ASSETS.flatMap(([from, to]) => {
    try {
      const d = imageSize(readFileSync(path.join(CONTENT_DIR, from)));
      return d.width && d.height
        ? [[`/${to}`, { width: d.width, height: d.height }]]
        : [];
    } catch {
      return [];
    }
  }),
);

/** A post as SitePage renders it: the route resolver, PostLayout, its footer (awaited here, streamed in the app). */
async function renderPost(s: Scenario): Promise<string> {
  const { data: metadata } = matter(s.markdown);
  if (metadata.date instanceof Date)
    metadata.date = metadata.date.toISOString().slice(0, 10);
  const pagePath = s.path!;
  const files = postFiles(site.files);
  const hostPaths = postHostPaths(pagePath, files);
  const hosts = Object.fromEntries(
    site.rows
      .filter((r) => hostPaths.includes(r.path))
      .map((r) => [r.path, r.metadata]),
  );
  const dirs = datedShareDirs({ pagePath, files, hosts });
  const route = resolvePostRoute({
    pagePath,
    metadata,
    files,
    hosts,
    datedShare: dirs.length ? await loadDatedShares('preview', dirs) : {},
  });
  if (route.kind !== 'post') throw new Error(`${s.name}: not a post`);
  const body = await processMarkdown(s.markdown, {
    files: site.files,
    filePath: pagePath,
    siteHostname: SITE_HOSTNAME,
    siteId: 'preview',
    permalinks: {},
  });
  const handles = Array.isArray(metadata.authors) ? metadata.authors : [];
  const { db } = await import('@/server/db');
  const authors = handles.length
    ? await resolveAuthors(db as never, {
        siteId: 'preview',
        handles,
        siteHostname: SITE_HOSTNAME,
        files: site.files,
      })
    : [];
  // The breadcrumb trail of a post in a folder: the folder, then the post
  const crumbs = pageHeaderBreadcrumbs({
    tree: [],
    pagePath,
    title: metadata.title,
    section: route.collection
      ? (site.rows.find((r) => r.path === route.collection!.hostPath)?.metadata
          .title ??
        route.collection.dir
          .split('/')
          .pop()!
          .replace(/^./, (c) => c.toUpperCase()))
      : undefined,
  }).map((c, i) =>
    i === 0 && route.collection
      ? { ...c, href: `/${route.collection.dir}` }
      : c,
  );
  const footer = route.collection
    ? await PostFooterSection({
        siteId: 'preview',
        collection: route.collection,
        pagePath,
        siteHostname: SITE_HOSTNAME,
        files: site.files,
        permalinks: {},
        locale: s.locale ?? LOCALE,
      })
    : null;
  const html = renderToStaticMarkup(
    <div className="site-layout no-nav">
      <div className="site-body">
        <div className="layout-inner">
          <div className="layout-inner-center post-layout">
            <main className="page-main">
              <PostLayout
                title={metadata.title ?? ''}
                description={metadata.description ?? ''}
                eyebrow={crumbs.slice(0, -1)}
                authors={authors}
                date={metadata.date}
                locale={s.locale ?? LOCALE}
                readingTime={s.readingTime}
                hero={resolvePostHero({
                  metadata,
                  body: s.markdown,
                  pagePath,
                  files: site.files,
                  siteHostname: SITE_HOSTNAME,
                  dimensions: s.unknownSizes ? {} : DIMENSIONS,
                })}
                tags={frontmatterTags(metadata)}
                after={footer}
              >
                <div className="rendered-mdx" id="mdxpage">
                  {body}
                </div>
              </PostLayout>
            </main>
          </div>
        </div>
      </div>
    </div>,
  );
  return html.replaceAll(`http://${SITE_HOSTNAME}/`, 'site/');
}

async function renderScenario(s: Scenario): Promise<string> {
  if (s.post) return renderPost(s);
  const { data: metadata } = matter(s.markdown);
  if (s.legacy)
    return wrap(
      <BlogLayout title={metadata.title ?? ''}>
        <div className="rendered-mdx" id="mdxpage">
          <List siteId="preview" {...s.legacy} />
        </div>
      </BlogLayout>,
    );
  const pageNo = s.page ?? 1;
  const route = resolveListingRoute({
    slug: s.slug,
    blob: s.path ? { path: s.path } : null,
    metadata: s.path ? metadata : null,
    content: s.path ? s.markdown : '',
    siteFilePaths: site.files,
    changelogKind: null,
  });
  const common = {
    site: { id: 'preview' },
    siteHostname: SITE_HOSTNAME,
    siteFilePaths: site.files,
    permalinks: {},
    page: pageNo,
    locale: s.locale ?? LOCALE,
  };
  let body: React.ReactElement;
  if (route.kind === 'virtual') {
    const listing = await renderPageListing({
      ...common,
      filePath: `${route.dir}/index.md`,
      route,
      publicUrl: s.slug,
    });
    body = (
      <VirtualListingPage
        title={route.title}
        listing={listing}
        view="list"
        feedUrl={listingFeedUrl(route, PREVIEW_RSS)}
      />
    );
  } else {
    if (!s.path)
      throw new Error(
        `${s.name}: no file and no zero-config folder at ${s.slug}`,
      );
    const content = await processMarkdown(s.markdown, {
      files: site.files,
      filePath: s.path,
      siteHostname: SITE_HOSTNAME,
      siteId: 'preview',
      permalinks: {},
      listing: {
        page: pageNo,
        publicUrl: s.slug,
        locale: s.locale ?? LOCALE,
        paginationClaimed: route.kind === 'page' && route.pageSize != null,
      },
    });
    const pageListing =
      route.kind === 'page'
        ? await renderPageListing({
            ...common,
            filePath: s.path,
            route,
            publicUrl: s.slug,
            pageTitle: metadata.title,
          })
        : null;
    const header = {
      title: metadata.title ?? '',
      description: metadata.description ?? '',
    };
    // Same shells as SitePage
    body =
      route.kind === 'page' ? (
        <ListingPage
          {...header}
          view={route.view}
          feedUrl={listingFeedUrl(route, PREVIEW_RSS)}
          intro={content}
          hasIntro={!!matter(s.markdown).content.trim()}
          listing={pageListing}
        />
      ) : (
        <BlogLayout {...header}>
          <div className="rendered-mdx" id="mdxpage">
            {content}
          </div>
        </BlogLayout>
      );
  }
  return wrap(body);
}

function wrap(body: React.ReactElement): string {
  const html = renderToStaticMarkup(
    <div className="site-layout no-nav">
      <div className="site-body">
        <div className="layout-inner">
          <div className="layout-inner-center">
            <main className="page-main">{body}</main>
          </div>
        </div>
      </div>
    </div>,
  );
  // Site assets resolve to http://<siteHostname>/…; serve them from ./site/
  return html.replaceAll(`http://${SITE_HOSTNAME}/`, 'site/');
}

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** ?theme=<name> loads an official theme after the app CSS (like the site layout); ?dark sets data-theme; ?shot hides the source panel. */
const HEAD_SCRIPT = `(function(){var q=new URLSearchParams(location.search),d=document.documentElement;
d.setAttribute('data-theme',q.has('dark')?'dark':'light');
if(q.has('shot'))d.classList.add('lp-shot');
var t=q.get('theme');if(t&&/^[a-z-]+$/.test(t))document.write('<link rel="stylesheet" href="themes/'+t+'.css">');})();`;

const PREVIEW_CSS = `
.lp-source{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;background:#f6f6f4;color:#222;border-bottom:1px solid #ddd;padding:16px 24px}
.lp-source h1{font:600 15px/1.4 system-ui,sans-serif;margin:0 0 4px}
.lp-source p{font:13px/1.4 system-ui,sans-serif;margin:0 0 8px;color:#555}
.lp-source pre{margin:0;white-space:pre-wrap}
.lp-source nav{font:12px system-ui,sans-serif;margin-top:8px}
.lp-source nav a{color:#0a58ca;margin-right:12px}
.lp-shot .lp-source{display:none}
:root{--next-font-body:'Lora';--next-font-heading:'Inter';--next-font-brand:'Inter'}`;

function pageHtml(s: Scenario, rendered: string): string {
  const variants = ['', '?dark', ...THEMES.map((t) => `?theme=${t}`)];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(s.title)} · listing preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@200..600&family=Lora:wght@400..600&display=swap">
<link rel="stylesheet" href="app.css">
<style>${PREVIEW_CSS}</style>
<script>${HEAD_SCRIPT}</script>
</head>
<body>
<header class="lp-source"><h1>${esc(s.title)}</h1>${s.about ? `<p>${esc(s.about)}</p>` : ''}<p>${esc(s.path ?? '(no file)')} at ${esc(s.slug)}${s.page ? `?page=${s.page}` : ''}</p><pre>${esc(s.markdown)}</pre>
<nav><a href="index.html">all scenarios</a>${variants.map((v) => `<a href="${s.name}.html${v}">${v || 'default'}</a>`).join('')}</nav></header>
${rendered}
</body>
</html>
`;
}

function indexHtml(): string {
  const rows = SCENARIOS.map(
    (s) =>
      `<li><a href="${s.name}.html">${esc(s.title)}</a> · <a href="${s.name}.html?dark">dark</a> · ${THEMES.map((t) => `<a href="${s.name}.html?theme=${t}">${t}</a>`).join(' · ')}</li>`,
  ).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Listing preview</title>
<style>body{font:15px/1.6 system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem}a{color:#0a58ca}</style></head>
<body><h1>Listing preview</h1><p>Each page runs the real route resolver, remark-listing plugin and renderer over an in-memory site (real changelog entries and images). Rebuild with <code>pnpm preview:listings</code>.</p><ul>
${rows}
</ul></body></html>`;
}

it('builds the listing preview', async () => {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(path.join(OUT, 'themes'), { recursive: true });
  // The app's real stylesheet, compiled the way Next does (Tailwind v3 + postcss.config.js)
  execFileSync(
    path.join(APP, 'node_modules/.bin/tailwindcss'),
    [
      '--postcss',
      '-i',
      'styles/default-theme.css',
      '-o',
      path.join(OUT, 'app.css'),
    ],
    { cwd: APP, stdio: 'pipe' },
  );
  for (const [from, to] of ASSETS) {
    mkdirSync(path.dirname(path.join(OUT, 'site', to)), { recursive: true });
    copyFileSync(path.join(CONTENT_DIR, from), path.join(OUT, 'site', to));
  }
  for (const t of THEMES) {
    const src = path.join(THEMES_DIR, t, 'theme.css');
    if (existsSync(src))
      copyFileSync(src, path.join(OUT, 'themes', `${t}.css`));
  }
  const emitted = new Set<string>();
  for (const s of SCENARIOS) {
    const rendered = await renderScenario(s);
    expect(rendered, s.name).toMatch(s.post ? /post-page/ : /list-component/);
    for (const m of rendered.matchAll(/class="([^"]*)"/g))
      for (const c of m[1]!.split(/\s+/))
        if (/^(list(ing)?|post)-/.test(c)) emitted.add(c);
    writeFileSync(path.join(OUT, `${s.name}.html`), pageHtml(s, rendered));
  }
  // Tailwind drops @layer components rules whose classes it does not find in
  // its content globs: every listing class the source styles must survive.
  const source = readFileSync(
    path.join(APP, 'styles/default-theme.css'),
    'utf8',
  );
  const compiled = readFileSync(path.join(OUT, 'app.css'), 'utf8');
  const has = (css: string, c: string) =>
    new RegExp(`\\.${c}(?![\\w-])`).test(css);
  const purged = [...emitted].filter(
    (c) => has(source, c) && !has(compiled, c),
  );
  expect(
    purged,
    'listing classes styled in default-theme.css but missing from the compiled CSS',
  ).toEqual([]);
  writeFileSync(path.join(OUT, 'index.html'), indexHtml());
  writeFileSync(
    path.join(OUT, 'scenarios.json'),
    JSON.stringify(SCENARIOS, null, 2),
  );
  console.log(
    `listing preview: ${SCENARIOS.length} scenarios → ${OUT}/index.html`,
  );
});
