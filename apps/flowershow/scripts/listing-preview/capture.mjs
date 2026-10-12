// Screenshots and layout assertions for the static listing preview.
// Usage (from apps/flowershow, after building the preview):
//   node scripts/listing-preview/capture.mjs [outDir] [nameFilterRegex]
// Default outDir: .listing-preview/shots (gitignored). Exits non-zero if a layout check fails.
// Theme matrix (shots with a theme) only when the filter mentions "theme-", e.g.
//   THEMES_DIR=../../../themes pnpm preview:listings && node scripts/listing-preview/capture.mjs .listing-preview/shots/themes-before theme-
//   THEMES_DIR=<patched themes> pnpm preview:listings && node scripts/listing-preview/capture.mjs .listing-preview/shots/themes-after theme-
import { mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const preview = path.resolve(here, '../../.listing-preview');
const out = path.resolve(process.argv[2] ?? path.join(preview, 'shots'));
const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
const MAX_BYTES = 300 * 1024;
mkdirSync(out, { recursive: true });

const scenarios = JSON.parse(
  readFileSync(path.join(preview, 'scenarios.json'), 'utf8'),
);
/** @param {string} name @param {{ dark?: boolean, theme?: string }} [opts] */
const urlFor = (name, { dark, theme } = {}) => {
  const q = new URLSearchParams({ shot: '' });
  if (dark) q.set('dark', '');
  if (theme) q.set('theme', theme);
  return `${pathToFileURL(path.join(preview, `${name}.html`)).href}?${q}`;
};

const browser = await chromium.launch();
const failures = [];
async function open(name, opts = {}) {
  const width = opts.width ?? 1440;
  const page = await browser.newPage({
    viewport: {
      width,
      height: width === 390 ? 844 : width === 768 ? 1024 : 900,
    },
    deviceScaleFactor: 1,
    colorScheme: opts.dark ? 'dark' : 'light',
  });
  await page.goto(urlFor(name, opts), { waitUntil: 'load' });
  // Lazy images below the fold never load in a static screenshot; load them all, then wait (bounded).
  await page.evaluate(async () => {
    for (const i of document.images) i.loading = 'eager';
    const settle = Promise.all(
      [...document.images].map((i) =>
        i.complete
          ? null
          : new Promise((r) => {
              i.onload = i.onerror = r;
            }),
      ),
    );
    await Promise.race([
      Promise.all([settle, document.fonts.ready]),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  });
  return page;
}

// Layout checks (design 4.9, tech M1): the grid is never capped at the reading measure; list pages are one 44rem column.
{
  const page = await open('grid-blog');
  const cols = await page.$eval(
    'section.list-component--grid',
    (g) => getComputedStyle(g).gridTemplateColumns.split(' ').length,
  );
  if (cols !== 3)
    failures.push(`grid-blog @1440: expected 3 grid columns, got ${cols}`);
  console.log(`check grid-blog @1440: ${cols} columns`);
  await page.close();
}
{
  // Page-level grid (no ToC column) reaches 3 columns at 1280; monogram tiles line up with image media
  const page = await open('grid-projects', { width: 1280 });
  const { cols, heights } = await page.$eval(
    'section.list-component--grid',
    (g) => ({
      cols: getComputedStyle(g).gridTemplateColumns.split(' ').length,
      heights: [...g.querySelectorAll('.list-component-item-media')].map((m) =>
        Math.round(m.getBoundingClientRect().height),
      ),
    }),
  );
  if (cols !== 3)
    failures.push(`grid-projects @1280: expected 3 grid columns, got ${cols}`);
  if (heights.length < 2 || new Set(heights).size !== 1)
    failures.push(
      `grid-projects: media and monogram tiles differ in height (${heights.join(', ')})`,
    );
  console.log(
    `check grid-projects @1280: ${cols} columns, media heights ${heights.join(', ')}`,
  );
  await page.close();
}
{
  // Whole grid card clickable (UX m-4): the summary's centre must hit the headline link's overlay
  const page = await open('grid-projects');
  const hit = await page.$eval(
    'section.list-component--grid > article .list-component-item-summary',
    (el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2,
      );
      return top?.closest('a')?.className ?? top?.className ?? '';
    },
  );
  if (!/list-component-item-headline-link/.test(hit))
    failures.push(
      `grid-projects: a click on the card summary hits "${hit}", not the card link`,
    );
  console.log(`check grid card overlay: ${hit}`);
  await page.close();
}
{
  const page = await open('archive-page-1');
  const { maxWidth, width } = await page.$eval(
    '.listing-page[data-view="list"]',
    (el) => ({
      maxWidth: getComputedStyle(el).maxWidth,
      width: el.getBoundingClientRect().width,
    }),
  );
  if (maxWidth !== '704px' || width > 704)
    failures.push(
      `archive-page-1 @1440: list page max-width ${maxWidth}, width ${width} (expected 704px)`,
    );
  console.log(`check list page @1440: max-width ${maxWidth}, width ${width}px`);
  await page.close();
}
{
  const page = await open('authors');
  const sizes = await page.$$eval(
    '.list-component-item-author-avatar',
    (els) => [
      ...new Set(
        els.map(
          (i) =>
            `${i.getBoundingClientRect().width}x${i.getBoundingClientRect().height}`,
        ),
      ),
    ],
  );
  if (sizes.join() !== '20x20')
    failures.push(`authors: avatars must be 20x20, got ${sizes.join(', ')}`);
  console.log(`check avatars: ${sizes.join(', ')}`);
  await page.close();
}
// B2 (design 4.9): compact columns line up; an inline compact teaser has no
// headings; people are 4 columns with initials tiles the size of photos; the
// featured hero is a 58% split in a wide grid and stacked on a 44rem list page.
{
  const page = await open('compact-category');
  const xs = await page.$$eval(
    'section.list-component--compact > article',
    (rows) => {
      const x = (el) => (el ? Math.round(el.getBoundingClientRect().x) : null);
      return [
        '.list-component-item-date',
        '.list-component-item-meta-value',
        '.list-component-item-headline',
      ].map((sel) => [...new Set(rows.map((r) => x(r.querySelector(sel))))]);
    },
  );
  if (xs.some((col) => col.length !== 1 || col[0] === null))
    failures.push(
      `compact-category: columns do not line up (${JSON.stringify(xs)})`,
    );
  console.log(
    `check compact columns: x ${xs.map((c) => c.join('/')).join(', ')}`,
  );
  await page.close();
}
// Long locale dates (pt-BR "30 de set. de 2026") never run under the title,
// and every row's title starts at the same x
for (const name of [
  'compact-archive',
  'compact-archive-pt',
  'compact-category',
])
  for (const width of [1440, 390]) {
    const page = await open(name, { width });
    const { overlaps, starts } = await page.$$eval(
      'section.list-component--compact > article',
      (rows) => {
        // Text boxes: the date can spill out of its cell (nowrap) and the
        // headline box is wider than its text; meta cells clip
        const box = (r, sel) => {
          const el = r.querySelector(sel);
          if (!el || /meta-value|eyebrow/.test(sel))
            return el?.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(el);
          return range.getBoundingClientRect();
        };
        const visible = (b) => b && b.width > 0;
        let overlaps = 0;
        const starts = new Set();
        for (const r of rows) {
          const h = box(r, '.list-component-item-headline');
          starts.add(Math.round(h.x));
          for (const sel of [
            '.list-component-item-date',
            '.list-component-item-meta-value',
            '.list-component-item-eyebrow',
          ]) {
            const b = box(r, sel);
            if (visible(b) && b.right > h.left + 0.5) overlaps++;
          }
        }
        return { overlaps, starts: [...starts] };
      },
    );
    if (overlaps)
      failures.push(
        `${name} @${width}: ${overlaps} date/meta cells overlap the title`,
      );
    if (starts.length !== 1)
      failures.push(`${name} @${width}: titles start at ${starts.join(', ')}`);
    console.log(
      `check ${name} @${width}: ${overlaps} overlaps, titles at x ${starts.join('/')}`,
    );
    await page.close();
  }
{
  const page = await open('compact-teaser');
  const headings = await page.$$eval(
    '.list-component-group-heading',
    (h) => h.length,
  );
  if (headings !== 0)
    failures.push(
      `compact-teaser: inline compact has ${headings} group headings`,
    );
  console.log(`check compact teaser: ${headings} group headings`);
  await page.close();
}
{
  const page = await open('people-grid');
  const { cols, sizes } = await page.$eval(
    'section.list-component--people',
    (g) => ({
      cols: getComputedStyle(g).gridTemplateColumns.split(' ').length,
      sizes: [
        ...new Set(
          [...g.querySelectorAll('.list-component-item-media')].map((m) => {
            const r = m.getBoundingClientRect();
            return `${Math.round(r.width)}x${Math.round(r.height)}`;
          }),
        ),
      ],
    }),
  );
  if (cols !== 4)
    failures.push(`people-grid @1440: expected 4 columns, got ${cols}`);
  if (sizes.length !== 1)
    failures.push(
      `people-grid: portraits and initials tiles differ (${sizes.join(', ')})`,
    );
  console.log(`check people @1440: ${cols} columns, media ${sizes.join(', ')}`);
  await page.close();
}
for (const [name, split] of [
  ['grid-featured', true],
  ['list-featured', false],
]) {
  const page = await open(name);
  const share = await page.$eval('.list-component-item--featured', (a) => {
    const m = a.querySelector('.list-component-item-media');
    if (!m) return 0;
    return Math.round(
      (m.getBoundingClientRect().width / a.getBoundingClientRect().width) * 100,
    );
  });
  if (split ? share < 55 || share > 61 : share !== 100)
    failures.push(
      `${name}: featured image is ${share}% of the hero (expected ${split ? '58' : '100'}%)`,
    );
  console.log(`check ${name}: featured image ${share}% wide`);
  await page.close();
}
// magazine: three columns side by side at 1440 (hero in the middle), stacked at 390
for (const width of [1440, 768, 390]) {
  const page = await open('magazine-blog', { width });
  const box = (sel) =>
    page.$eval(sel, (e) => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
    });
  const top = '.list-component-magazine-top';
  const hero = await box(`${top} > .list-component-item--featured`);
  const side = await box(`${top} > .list-component-magazine-side`);
  const more = await box(`${top} > .list-component-magazine-more`);
  const ok =
    width === 1440
      ? side.x < hero.x &&
        hero.x < more.x &&
        side.y === hero.y &&
        hero.y === more.y
      : width === 768
        ? side.y > hero.y && side.y === more.y && side.x < more.x
        : hero.y < side.y && side.y < more.y && side.x === more.x;
  if (!ok)
    failures.push(
      `magazine-blog @${width}: unexpected columns ${JSON.stringify({ hero, side, more })}`,
    );
  console.log(
    `check magazine-blog @${width}: hero ${hero.w}px, side ${side.w}px, more ${more.w}px`,
  );
  await page.close();
}
// A long single author name never overflows a narrow meta line (it wraps
// inside itself only when it is wider than the column)
for (const width of [1440, 768, 390]) {
  const page = await open('magazine-long-author', { width });
  const over = await page.$$eval(
    '.list-component-magazine-top .list-component-item-meta',
    (metas) =>
      metas
        .filter((m) =>
          [...m.querySelectorAll('*')].some(
            (c) =>
              c.getBoundingClientRect().right >
              m.getBoundingClientRect().right + 0.5,
          ),
        )
        .map((m) => m.textContent),
  );
  const named = await page.$$eval('.list-component-item-author', (a) =>
    a.some((e) => e.textContent === 'Maximilian von Habsburg-Lothringen'),
  );
  if (!named) failures.push('magazine-long-author: the long name is missing');
  if (over.length)
    failures.push(
      `magazine-long-author @${width}: meta overflows (${over.join(' | ')})`,
    );
  console.log(
    `check magazine-long-author @${width}: ${over.length} overflowing meta lines`,
  );
  await page.close();
}
// magazine page: the rows below line up with the top grid (left edge, hero's
// right edge), and the page title uses the cards' title font
{
  const page = await open('magazine-blog');
  const m = await page.evaluate(() => {
    const r = (sel) => document.querySelector(sel).getBoundingClientRect();
    const font = (sel) =>
      getComputedStyle(document.querySelector(sel)).fontFamily;
    const top = r('.list-component-magazine-top');
    const hero = r(
      '.list-component-magazine-top > .list-component-item--featured',
    );
    const rest = r('.list-component-magazine-rest');
    return {
      left: Math.round(rest.left - top.left),
      right: Math.round(rest.right - hero.right),
      h1: font('.page-header-title'),
      card: font('.list-component-item--card .list-component-item-headline'),
      feed: !!document.querySelector(
        '.page-header-actions .listing-page-feed-link',
      ),
    };
  });
  if (m.left !== 0 || Math.abs(m.right) > 1)
    failures.push(
      `magazine-blog @1440: rows not on the top grid (${JSON.stringify(m)})`,
    );
  if (m.h1 !== m.card)
    failures.push(
      `magazine-blog: page title font ${m.h1}, card titles ${m.card}`,
    );
  if (!m.feed) failures.push('magazine-blog: no feed link in the header');
  console.log(`check magazine-blog rows and title: ${JSON.stringify(m)}`);
  await page.close();
}
for (const name of [
  'zero-config-blog',
  'grid-blog',
  'long-titles',
  'compact-archive',
  'people-team',
  'grid-featured',
  'magazine-blog',
  'magazine-text-only',
]) {
  const page = await open(name, { width: 390 });
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  if (overflow > 0)
    failures.push(`${name} @390: horizontal scroll of ${overflow}px`);
  console.log(`check ${name} @390: horizontal overflow ${overflow}px`);
  await page.close();
}

// Post pages (PR F): one 44rem column, a wider read-more band of 3 cards (1 on
// phones), the hero inside the column, 40px byline avatars, no horizontal scroll.
for (const width of [1440, 390]) {
  const page = await open('post-full', { width });
  const m = await page.evaluate(() => {
    const w = (sel) =>
      document.querySelector(sel)?.getBoundingClientRect().width ?? 0;
    const grid = document.querySelector(
      '.post-read-more .list-component--grid',
    );
    return {
      article: w('article.post-page'),
      hero: w('.post-hero-img'),
      cols: grid
        ? getComputedStyle(grid).gridTemplateColumns.split(' ').length
        : 0,
      avatar: w('.post-byline-avatar'),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  const want = width === 1440 ? { article: 704, cols: 3 } : { cols: 1 };
  if (want.article && m.article !== want.article)
    failures.push(
      `post-full @${width}: article ${m.article}px (expected ${want.article})`,
    );
  if (m.hero > m.article + 0.5)
    failures.push(`post-full @${width}: hero wider than the column`);
  if (m.cols !== want.cols)
    failures.push(
      `post-full @${width}: read-more has ${m.cols} columns (expected ${want.cols})`,
    );
  if (m.avatar !== 40)
    failures.push(`post-full @${width}: byline avatar ${m.avatar}px`);
  if (m.overflow > 0)
    failures.push(`post-full @${width}: horizontal scroll ${m.overflow}px`);
  console.log(`check post-full @${width}: ${JSON.stringify(m)}`);
  await page.close();
}

let n = 0;
for (const s of scenarios) {
  for (const shot of s.shots ?? []) {
    if (only && !only.test(shot.file)) continue;
    // Theme shots compare two theme checkouts: only on request (filter "theme-")
    if (shot.theme && !(only && /theme-/.test(only.source))) continue;
    const page = await open(s.name, shot);
    const target = shot.selector ? page.locator(shot.selector).first() : page;
    if (shot.from) {
      // From an element's top to the end of the page
      const y = await page.$eval(
        shot.from,
        (el) => el.getBoundingClientRect().top + window.scrollY - 24,
      );
      const h = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      const width = shot.width ?? 1440;
      shot.clip = {
        x: 0,
        y: Math.max(0, y),
        width,
        height: h - Math.max(0, y),
      };
    }
    const png = path.join(out, `${shot.file}.png`);
    const jpg = path.join(out, `${shot.file}.jpg`);
    for (const f of [png, jpg])
      try {
        unlinkSync(f);
      } catch {}
    const opts = shot.clip
      ? { clip: shot.clip, fullPage: true }
      : shot.fullPage
        ? { fullPage: true }
        : {};
    await target.screenshot({ path: png, ...opts });
    if (statSync(png).size > MAX_BYTES) {
      unlinkSync(png);
      await target.screenshot({
        path: jpg,
        type: 'jpeg',
        quality: 80,
        ...opts,
      });
    }
    await page.close();
    n++;
  }
}
await browser.close();
console.log(`wrote ${n} screenshots to ${out}`);
if (failures.length) {
  console.error(`layout checks failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
