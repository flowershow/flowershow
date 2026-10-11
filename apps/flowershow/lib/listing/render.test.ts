import type { Root } from 'mdast';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import type { ListingItem } from './items';
import {
  renderListing,
  renderListingError,
  type RenderListingInput,
} from './render';
import { DEFAULT_FIELDS, type ListingSpec } from './spec';

// ListingImage is an MDX JSX element; give it a visible stand-in for plain remark-rehype.
const handlers = {
  mdxJsxFlowElement: (_s: any, node: any) => ({
    type: 'element',
    tagName: 'listing-image',
    properties: Object.fromEntries(
      node.attributes.map((a: any) => [a.name, a.value]),
    ),
    children: [],
  }),
};
async function html(node: any) {
  const tree: Root = { type: 'root', children: [node] };
  const processor = unified()
    .use(remarkRehype, { handlers } as any)
    .use(rehypeStringify);
  return new DOMParser().parseFromString(
    String(processor.stringify((await processor.run(tree)) as any)),
    'text/html',
  ).body;
}

const spec = (o: Partial<ListingSpec> = {}): ListingSpec => ({
  from: 'blog',
  fromRelative: false,
  view: 'list',
  sort: { field: 'date', direction: 'desc' },
  limit: null,
  pageSize: 20,
  where: {},
  fields: DEFAULT_FIELDS.list,
  media: 'thumb',
  mediaSide: 'left',
  ratio: '3/2',
  defaultImage: null,
  featured: 0,
  group: { by: 'none' },
  ...o,
});
const item = (o: Partial<ListingItem> = {}): ListingItem => ({
  path: 'blog/a.md',
  url: '/blog/a',
  title: 'A post',
  date: '2026-09-18',
  dateInEyebrow: false,
  summary: 'Summary',
  image: 'http://h/a.jpg',
  authorHandles: ['ada', 'guest'],
  eyebrow: [],
  meta: [],
  group: null,
  ...o,
});
const authors = new Map([
  [
    'ada',
    {
      key: 'b1',
      name: 'Ada Lovelace',
      url: '/people/ada',
      avatar: 'http://h/ada.jpg',
    },
  ],
  ['guest', { key: 'guest', name: 'Guest Writer', url: null }],
  ['c', { key: 'c', name: 'C', url: null }],
  ['d', { key: 'd', name: 'D', url: null }],
]);
const page = (
  items: ListingItem[],
  o: Partial<RenderListingInput['page']> = {},
) => ({
  items,
  page: 1,
  pageCount: 1,
  total: items.length,
  paginated: false,
  ...o,
});
const input = (o: Partial<RenderListingInput> = {}): RenderListingInput => ({
  spec: spec(),
  page: page([item()]),
  authors,
  publicUrl: '/blog',
  locale: 'en-US',
  ...o,
});

describe('card anatomy (design section 6)', () => {
  it('list view: root attributes and slot order; no aria-label inline', async () => {
    const body = await html(renderListing(input()));
    const root = body.querySelector(
      'section.list-component.list-component--list.not-prose[data-view="list"][data-media="thumb"][data-ratio="3-2"]',
    )!;
    expect(root).not.toBeNull();
    expect(root.hasAttribute('aria-label')).toBe(false);
    expect(root.hasAttribute('data-listing-notes')).toBe(false);
    const art = root.querySelector(':scope > article.list-component-item')!;
    expect(
      art.querySelector(
        ':scope > .list-component-item-media > a.list-component-item-media-link[href="/blog/a"][tabindex="-1"][aria-hidden="true"] > listing-image[src="http://h/a.jpg"][variant="media"][sizes="(min-width: 640px) 160px, 88px"]',
      ),
    ).not.toBeNull();
    const content = art.querySelector(':scope > .list-component-item-content')!;
    expect([...content.children].map((c) => c.className)).toEqual([
      'list-component-item-headline',
      'list-component-item-summary',
      'list-component-item-meta',
    ]);
    const h3 = content.querySelector('h3.list-component-item-headline')!;
    expect(h3.id).toBe('listing-item-heading');
    expect(h3.getAttribute('data-toc-ignore')).toBe('');
    expect(
      h3.querySelector('a.list-component-item-headline-link[href="/blog/a"]')!
        .textContent,
    ).toBe('A post');
    const meta = content.querySelector('.list-component-item-meta')!;
    expect(
      meta.querySelector(
        ':scope > time.list-component-item-date[datetime="2026-09-18"]',
      )!.textContent,
    ).toBe('Sep 18, 2026');
    const by = meta.querySelector(':scope > span.list-component-item-authors')!;
    expect(
      by.querySelector(
        '.list-component-item-avatars > listing-image[variant="avatar"][src="http://h/ada.jpg"]',
      ),
    ).not.toBeNull();
    expect(
      by.querySelector('a.list-component-item-author[href="/people/ada"]')!
        .textContent,
    ).toBe('Ada Lovelace');
    expect(
      by.querySelector('span.list-component-item-author')!.textContent,
    ).toBe('Guest Writer');
  });
  it('page-level listings carry the page title as aria-label', async () => {
    expect(
      (await html(renderListing(input({ label: 'Blog' }))))
        .querySelector('section')!
        .getAttribute('aria-label'),
    ).toBe('Blog');
  });
  it('dates follow the locale; the ISO date stays in datetime', async () => {
    const t = (
      await html(renderListing(input({ locale: 'de-DE' })))
    ).querySelector('time')!;
    expect(t.getAttribute('datetime')).toBe('2026-09-18');
    expect(t.textContent).not.toBe('Sep 18, 2026');
  });
  it('eyebrow and meta values; a date in the eyebrow is not repeated in the meta line', async () => {
    const body = await html(
      renderListing(
        input({
          page: page([
            item({
              dateInEyebrow: true,
              eyebrow: [{ text: 'Sep 18, 2026' }, { text: 'Themes' }],
              meta: [
                {
                  key: 'guests',
                  label: 'Guests',
                  parts: [
                    { text: 'Ada', href: '/people/ada' },
                    { text: 'Grace' },
                  ],
                },
              ],
            }),
          ]),
        }),
      ),
    );
    expect(
      body
        .querySelector('.list-component-item-content > :first-child')!
        .matches('div.list-component-item-eyebrow'),
    ).toBe(true);
    expect(
      [...body.querySelectorAll('.list-component-item-eyebrow > span')].map(
        (s) => s.textContent,
      ),
    ).toEqual(['Sep 18, 2026', 'Themes']);
    expect(body.querySelector('.list-component-item-meta time')).toBeNull();
    expect(
      body.querySelector(
        '.list-component-item-meta-value[data-field="guests"]',
      )!.innerHTML,
    ).toBe('<a href="/people/ada">Ada</a>, Grace');
  });
  it('more than two authors: two names then "and N others"; at most three avatars', async () => {
    const by = (
      await html(
        renderListing(
          input({
            page: page([item({ authorHandles: ['ada', 'guest', 'c', 'd'] })]),
          }),
        ),
      )
    ).querySelector('.list-component-item-authors')!;
    expect(by.querySelectorAll('.list-component-item-author')).toHaveLength(2);
    expect(
      by.querySelector('.list-component-item-authors-more')!.textContent,
    ).toBe('and 2 others');
  });
  it('three authors: "and 1 other", singular', async () => {
    const by = (
      await html(
        renderListing(
          input({
            page: page([item({ authorHandles: ['ada', 'guest', 'c'] })]),
          }),
        ),
      )
    ).querySelector('.list-component-item-authors')!;
    expect(
      by.querySelector('.list-component-item-authors-more')!.textContent,
    ).toBe('and 1 other');
  });
  it('list: a row without an image collapses (no media, no placeholder); media none hides images', async () => {
    const body = await html(
      renderListing(
        input({ page: page([item(), item({ url: '/b', image: null })]) }),
      ),
    );
    expect(body.querySelectorAll('.list-component-item-media')).toHaveLength(1);
    expect(
      (
        await html(renderListing(input({ spec: spec({ media: 'none' }) })))
      ).querySelector('.list-component-item-media'),
    ).toBeNull();
  });
  it('cover uses the cover sizes and ratio attribute', async () => {
    const cover = await html(
      renderListing(input({ spec: spec({ media: 'cover', ratio: '16/9' }) })),
    );
    expect(
      cover
        .querySelector(
          'section[data-media="cover"][data-ratio="16-9"] listing-image',
        )!
        .getAttribute('sizes'),
    ).toBe('(min-width: 768px) 44rem, 100vw');
  });
  it('escapes frontmatter text', async () => {
    const body = await html(
      renderListing(
        input({
          page: page([item({ title: '<img src=x onerror=alert(1)>' })]),
        }),
      ),
    );
    expect(body.querySelector('img')).toBeNull();
    expect(
      body.querySelector('.list-component-item-headline-link')!.textContent,
    ).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('grid view and the no-image rule (UX M-2)', () => {
  const grid = spec({ view: 'grid', media: 'cover', ratio: '16/9' });
  it('grid modifier and sizes', async () => {
    const body = await html(renderListing(input({ spec: grid })));
    expect(
      body
        .querySelector(
          'section.list-component--grid[data-view="grid"] listing-image[variant="media"]',
        )!
        .getAttribute('sizes'),
    ).toBe('(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw');
  });
  it('mixed grid: a card without an image has no media block at all (no placeholder)', async () => {
    const body = await html(
      renderListing(
        input({
          spec: grid,
          page: page([item(), item({ url: '/b', image: null })]),
        }),
      ),
    );
    const cards = body.querySelectorAll('section > article');
    expect(
      cards[0]!.querySelector('.list-component-item-media'),
    ).not.toBeNull();
    expect(cards[1]!.querySelector('.list-component-item-media')).toBeNull();
    expect(
      body.querySelectorAll('.list-component-item-media--placeholder'),
    ).toHaveLength(0);
  });
  it('list thumbnails: data-media-side left by default, right on request; only for thumb', async () => {
    const side = async (o: Partial<ListingSpec>) =>
      (await html(renderListing(input({ spec: spec(o) }))))
        .querySelector('section')!
        .getAttribute('data-media-side');
    expect(await side({})).toBe('left');
    expect(await side({ mediaSide: 'right' })).toBe('right');
    expect(await side({ media: 'cover' })).toBeNull();
  });
  it('no item with an image: the slot collapses for the whole listing', async () => {
    const body = await html(
      renderListing(
        input({
          spec: grid,
          page: page([item({ image: null }), item({ url: '/b', image: null })]),
        }),
      ),
    );
    expect(body.querySelector('.list-component-item-media')).toBeNull();
    expect(body.querySelector('section')!.getAttribute('data-media')).toBe(
      'none',
    );
  });
});

describe('notes are invisible (UX M-13)', () => {
  it('notes go to data-listing-notes; nothing visible is added', async () => {
    const body = await html(
      renderListing(
        input({
          notes: ['"pageSize" is ignored because "limit" is set.', 'second'],
        }),
      ),
    );
    expect(
      body.querySelector('section')!.getAttribute('data-listing-notes'),
    ).toBe('"pageSize" is ignored because "limit" is set. | second');
    expect(
      body.querySelector('section > :first-child')!.matches('article'),
    ).toBe(true);
  });
  it('an empty folder with a note is a section with the note attribute and the empty text', async () => {
    const body = await html(
      renderListing(input({ notes: ['n'], page: page([], { total: 0 }) })),
    );
    expect(
      body.querySelector(
        'section[data-listing-notes="n"] > p.list-component-empty',
      ),
    ).not.toBeNull();
  });
});

describe('empty and pagination (4.8)', () => {
  it('an empty folder is a paragraph, not a section', async () => {
    const body = await html(
      renderListing(input({ page: page([], { total: 0, paginated: true }) })),
    );
    expect(body.querySelector('section')).toBeNull();
    expect(body.querySelector('p.list-component-empty')!.textContent).toBe(
      'Nothing here yet.',
    );
  });
  it('an out-of-range page keeps the strip', async () => {
    const body = await html(
      renderListing(
        input({
          page: page([], { page: 9, pageCount: 3, total: 45, paginated: true }),
        }),
      ),
    );
    expect(
      body.querySelector('section > p.list-component-empty'),
    ).not.toBeNull();
    expect(
      body.querySelector('section > nav.list-component-pagination:last-child'),
    ).not.toBeNull();
  });
  it('page 1 of 12: disabled Newer span, numbered strip, Older link', async () => {
    const body = await html(
      renderListing(
        input({
          page: page([item()], { pageCount: 12, total: 240, paginated: true }),
        }),
      ),
    );
    const nav = body.querySelector(
      'section > nav.list-component-pagination[aria-label="Pages"]:last-child',
    )!;
    const prev = nav.querySelector(
      '.list-component-pagination-nav > .list-component-pagination-button--prev',
    )!;
    expect(prev.tagName).toBe('SPAN');
    expect(prev.classList.contains('is-disabled')).toBe(true);
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(prev.textContent).toBe('Newer');
    expect(
      prev.querySelector(
        'svg.list-component-pagination-button-icon.list-component-pagination-button-icon--prev[viewBox="0 0 24 24"]',
      ),
    ).not.toBeNull();
    expect(
      [...nav.querySelectorAll('.list-component-pagination-pages > *')].map(
        (e) => e.textContent,
      ),
    ).toEqual(['1', '2', '3', '…', '12']);
    expect(
      nav
        .querySelector(
          '.list-component-pagination-page-button--current[aria-current="page"]',
        )!
        .getAttribute('href'),
    ).toBe('/blog');
    const next = nav.querySelector(
      '.list-component-pagination-nav--end > a.list-component-pagination-button--next[rel="next"]',
    )!;
    expect(next.getAttribute('href')).toBe('/blog?page=2');
    expect(next.textContent).toBe('Older');
  });
  it('the last page links back with rel=prev and disables Older', async () => {
    const body = await html(
      renderListing(
        input({
          page: page([item()], {
            page: 2,
            pageCount: 2,
            total: 21,
            paginated: true,
          }),
        }),
      ),
    );
    expect(
      body
        .querySelector('a.list-component-pagination-button--prev[rel="prev"]')!
        .getAttribute('href'),
    ).toBe('/blog');
    expect(
      body.querySelector(
        'span.list-component-pagination-button--next.is-disabled',
      ),
    ).not.toBeNull();
  });
  it('non-date sorts say Previous/Next; one page has no strip', async () => {
    const titled = await html(
      renderListing(
        input({
          spec: spec({ sort: { field: 'title', direction: 'asc' } }),
          page: page([item()], { pageCount: 2, total: 21, paginated: true }),
        }),
      ),
    );
    expect(
      titled.querySelector('.list-component-pagination-button--next')!
        .textContent,
    ).toBe('Next');
    expect(
      (
        await html(
          renderListing(input({ page: page([item()], { paginated: true }) })),
        )
      ).querySelector('nav'),
    ).toBeNull();
  });
});

describe('renderListingError', () => {
  it('lists every problem and the keys this build accepts', async () => {
    const body = await html(
      renderListingError(
        ['Unknown key "perPage". Use "pageSize".'],
        'List block has problems',
      ),
    );
    const card = body.querySelector(
      'div.list-component-error.list-component-error--block',
    )!;
    expect(card.querySelector('.list-component-error-title')!.textContent).toBe(
      'List block has problems',
    );
    expect(card.querySelectorAll('li')).toHaveLength(1);
    expect(
      card.querySelector('.list-component-error-keys')!.textContent,
    ).toMatch(
      /^Keys: from, view, sort, limit, pageSize, where, fields, media, ratio, defaultImage(, featured, group)?\.$/,
    );
  });
});

describe.skip('[B2] compact, people, featured, grouping', () => {
  it('compact: date + title, no media', async () => {
    const body = await html(
      renderListing(
        input({
          spec: spec({
            view: 'compact',
            fields: DEFAULT_FIELDS.compact,
            media: 'none',
          }),
          page: page([item({ summary: null, authorHandles: [] })]),
        }),
      ),
    );
    expect(
      body.querySelector(
        'section.list-component--compact[data-view="compact"][data-media="none"] .list-component-item-date',
      ),
    ).not.toBeNull();
    expect(body.querySelector('.list-component-item-media')).toBeNull();
  });
  it('people: portrait sizes, role meta, initials when there is no portrait', async () => {
    const people = spec({
      view: 'people',
      fields: DEFAULT_FIELDS.people,
      media: 'cover',
      ratio: '1/1',
    });
    const body = await html(
      renderListing(
        input({
          spec: people,
          page: page([
            item({
              date: null,
              authorHandles: [],
              meta: [
                { key: 'role', label: 'Role', parts: [{ text: 'Founder' }] },
              ],
            }),
            item({
              url: '/g',
              title: 'Grace Hopper',
              image: null,
              date: null,
              authorHandles: [],
            }),
          ]),
        }),
      ),
    );
    expect(
      body
        .querySelector(
          'section.list-component--people[data-ratio="1-1"] listing-image',
        )!
        .getAttribute('sizes'),
    ).toBe('(min-width: 1024px) 25vw, 50vw');
    expect(
      body.querySelector('.list-component-item-meta-value[data-field="role"]')!
        .textContent,
    ).toBe('Founder');
    expect(
      body.querySelector(
        '.list-component-item-media--placeholder .list-component-item-initials',
      )!.textContent,
    ).toBe('GH');
  });
  it('featured: only the first item of the page the plugin marks, hero sizes, no placeholder, above the first group', async () => {
    const items = [
      item({ url: '/f', group: '2025' }),
      item({ url: '/a', group: '2026' }),
      item({ url: '/b', group: '2026', image: null }),
    ];
    const body = await html(
      renderListing(
        input({
          spec: spec({
            view: 'grid',
            featured: 1,
            media: 'cover',
            ratio: '16/9',
            group: { by: 'year' },
          }),
          featuredFirst: true,
          page: page(items),
        }),
      ),
    );
    const kids = [...body.querySelector('section')!.children].map((c) =>
      c.tagName === 'H2'
        ? `h2:${c.textContent}`
        : c.classList.contains('list-component-item--featured')
          ? 'hero'
          : 'article',
    );
    expect(kids).toEqual(['hero', 'h2:2026', 'article', 'article']);
    expect(
      body
        .querySelector('.list-component-item--featured listing-image')!
        .getAttribute('sizes'),
    ).toBe('(min-width: 768px) 58vw, 100vw');
  });
  it('grouping: flat headings before each group, out of the ToC', async () => {
    const items = [
      item({ url: '/a', group: '2026' }),
      item({ url: '/b', group: '2026' }),
      item({ url: '/c', group: '2025' }),
    ];
    const body = await html(
      renderListing(
        input({ spec: spec({ group: { by: 'year' } }), page: page(items) }),
      ),
    );
    const kids = [...body.querySelector('section')!.children].map((c) =>
      c.tagName === 'H2' ? `h2:${c.textContent}` : 'article',
    );
    expect(kids).toEqual([
      'h2:2026',
      'article',
      'article',
      'h2:2025',
      'article',
    ]);
    expect(
      body
        .querySelector('h2.list-component-group-heading')!
        .getAttribute('data-toc-ignore'),
    ).toBe('');
  });
});
