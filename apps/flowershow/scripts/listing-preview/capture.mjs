// Screenshots and layout assertions for the static listing preview.
// Usage (from apps/flowershow, after building the preview):
//   node scripts/listing-preview/capture.mjs [outDir] [nameFilterRegex]
// Default outDir: ../../docs/pr-assets/listings. Exits non-zero if a layout check fails.
// Theme matrix (shots with a theme) only when the filter mentions "theme-", e.g.
//   THEMES_DIR=../../../themes pnpm preview:listings && node scripts/listing-preview/capture.mjs ../../docs/pr-assets/listings/themes-before theme-
//   THEMES_DIR=<patched themes> pnpm preview:listings && node scripts/listing-preview/capture.mjs ../../docs/pr-assets/listings/themes-after theme-
import { mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const preview = path.resolve(here, '../../.listing-preview');
const out = path.resolve(
  process.argv[2] ?? path.join(here, '../../../../docs/pr-assets/listings'),
);
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
    viewport: { width, height: width === 390 ? 844 : 900 },
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
  // Whole grid card clickable (UX m-4): the summary's centre must hit the headline link's overlay
  const page = await open('grid-projects');
  const hit = await page.$eval(
    'section.list-component--grid > article .list-component-item-summary',
    (el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top?.closest('a')?.className ?? top?.className ?? '';
    },
  );
  if (!/list-component-item-headline-link/.test(hit))
    failures.push(`grid-projects: a click on the card summary hits "${hit}", not the card link`);
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
for (const name of ['zero-config-blog', 'grid-blog', 'long-titles']) {
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

let n = 0;
for (const s of scenarios) {
  for (const shot of s.shots ?? []) {
    if (only && !only.test(shot.file)) continue;
    // Theme shots compare two theme checkouts: only on request (filter "theme-")
    if (shot.theme && !(only && /theme-/.test(only.source))) continue;
    const page = await open(s.name, shot);
    const target = shot.selector ? page.locator(shot.selector).first() : page;
    const png = path.join(out, `${shot.file}.png`);
    const jpg = path.join(out, `${shot.file}.jpg`);
    for (const f of [png, jpg])
      try {
        unlinkSync(f);
      } catch {}
    await target.screenshot({ path: png });
    if (statSync(png).size > MAX_BYTES) {
      unlinkSync(png);
      await target.screenshot({ path: jpg, type: 'jpeg', quality: 80 });
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
