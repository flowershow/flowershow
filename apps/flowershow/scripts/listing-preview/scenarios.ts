/**
 * Preview scenarios. `path` is the page's file (null = no file: a zero-config
 * folder), `markdown` is exactly what the author writes (shown above the
 * render and in the PR). `shots` lists the screenshots capture.mjs takes.
 */
export type Shot = {
  file: string;
  width?: 1440 | 390;
  dark?: boolean;
  theme?: string;
  /** Crop to this element instead of the first screen. */
  selector?: string;
};
export type Scenario = {
  name: string;
  title: string;
  slug: string;
  path: string | null;
  markdown: string;
  page?: number;
  about?: string;
  /** Render the legacy MDX <List /> with these props instead (theme back-compat). */
  legacy?: {
    dir: string;
    fields?: Array<'title' | 'description' | 'authors' | 'date' | 'image'>;
    pageSize?: number;
  };
  shots?: Shot[];
};

/** Official themes copied into the preview (all six are linkable; the theme matrix shoots each). */
export const THEMES = [
  'leaf',
  'lessflowery',
  'letterpress',
  'superstack',
  'monospace',
  'material-draft',
];

/**
 * Theme matrix: one shot per theme for a view, plus mobile ones. Theme shots are
 * written only when capture.mjs is given a filter matching "theme-", so a
 * before/after pair comes from two builds (THEMES_DIR = the old and the new
 * themes checkout) captured into themes-before/ and themes-after/.
 */
function themeShots(view: string, mobile: Array<[string, 390]> = []): Shot[] {
  return [
    ...THEMES.map((theme) => ({ file: `theme-${theme}-${view}`, theme })),
    ...mobile.map(([theme, width]) => ({
      file: `theme-${theme}-${view}-mobile`,
      theme,
      width,
    })),
  ];
}

const page = (fm: string, body = '') =>
  `---\n${fm.trim()}\n---\n${body ? `\n${body.trim()}\n` : ''}`;
const inline = (title: string, block: string, intro = '') =>
  page(
    `title: ${title}`,
    `${intro ? `${intro}\n\n` : ''}## Latest posts\n\n${block.trim()}\n\n## More\n\nOrdinary page content continues after the block.`,
  );

export const SCENARIOS: Scenario[] = [
  {
    name: 'zero-config-blog',
    title: 'Zero-config blog folder (no README)',
    slug: '/blog',
    path: null,
    markdown:
      '# blog/ has no README.md and no settings:\nblog/\n  2026-10-10-mermaid-bases-pdf-in-markdown.md\n  2026-10-08-custom-footer.md\n  … 39 posts',
    about:
      'A folder named blog/ or posts/ with no README gets a listing page at /blog.',
    shots: [
      { file: 'zero-config-blog' },
      { file: 'mobile-list', width: 390 },
      { file: 'dark-list', dark: true },
    ],
  },
  {
    name: 'zero-config-blog-page-2',
    title: 'Zero-config blog, page 2 of 2',
    slug: '/blog',
    path: null,
    page: 2,
    markdown: '# /blog?page=2',
    shots: [
      { file: 'pagination-page-2', selector: 'nav.list-component-pagination' },
    ],
  },
  {
    name: 'prose-readme',
    title: 'Prose-only README in posts/ (listing appended)',
    slug: '/posts',
    path: 'posts/README.md',
    markdown: page(
      'title: Posts',
      'Notes on building Flowershow, roughly weekly.',
    ),
    shots: [{ file: 'prose-readme-auto-listing' }],
  },
  {
    name: 'archive-page-1',
    title: 'layout: list, page 1 of 12',
    slug: '/archive',
    path: 'archive/README.md',
    markdown: page('title: Archive\nlayout: list'),
    shots: [
      { file: 'list-page-layout' },
      ...themeShots('list', [['lessflowery', 390]]),
    ],
  },
  {
    name: 'archive-page-6',
    title: 'layout: list, page 6 of 12 (ellipsis both sides)',
    slug: '/archive',
    path: 'archive/README.md',
    page: 6,
    markdown: page('title: Archive\nlayout: list'),
    shots: [
      { file: 'pagination-middle', selector: 'nav.list-component-pagination' },
    ],
  },
  {
    name: 'latest-three',
    title: 'Latest 3 on a home page',
    slug: '/',
    path: 'README.md',
    markdown: page(
      'title: Home',
      'Welcome to the site.\n\n## Latest posts\n\n```blog\nlimit: 3\n```',
    ),
    shots: [{ file: 'latest-three' }],
  },
  {
    name: 'list-mixed-images',
    title: 'list: mixed images (some posts have none)',
    slug: '/',
    path: 'README.md',
    markdown: inline('Home', '```blog\nlimit: 6\n```'),
    shots: [{ file: 'list-mixed-images' }],
  },
  {
    name: 'list-thumb-right',
    title: 'list: thumbnail on the right (media: thumb right)',
    slug: '/',
    path: 'README.md',
    markdown: inline('Home', '```blog\nmedia: thumb right\nlimit: 6\n```'),
    shots: [
      { file: 'list-thumb-right' },
      { file: 'list-thumb-right-mobile', width: 390 },
    ],
  },
  {
    name: 'list-no-images',
    title: 'list: media none',
    slug: '/',
    path: 'README.md',
    markdown: inline('Home', '```blog\nmedia: none\nlimit: 6\n```'),
    shots: [{ file: 'list-no-images' }],
  },
  {
    name: 'list-cover',
    title: 'list: media cover',
    slug: '/',
    path: 'README.md',
    markdown: inline('Home', '```blog\nmedia: cover\nlimit: 3\n```'),
    shots: [{ file: 'list-cover' }],
  },
  {
    name: 'long-titles',
    title: 'Long and unbreakable titles',
    slug: '/',
    path: 'README.md',
    markdown: inline('Essays', '```list\nfrom: essays\n```'),
    shots: [
      { file: 'long-titles' },
      { file: 'long-titles-mobile', width: 390 },
    ],
  },
  {
    name: 'no-descriptions',
    title: 'No descriptions, no images',
    slug: '/',
    path: 'README.md',
    markdown: inline('Notes', '```list\nfrom: notes\n```'),
    shots: [{ file: 'no-descriptions' }],
  },
  {
    name: 'authors',
    title: 'Authors: avatars and names (1–4 authors, one without a page)',
    slug: '/',
    path: 'README.md',
    markdown: inline('Field notes', '```list\nfrom: field-notes\n```'),
    shots: [{ file: 'authors' }],
  },
  {
    name: 'grid-blog',
    title: 'grid with images',
    slug: '/',
    path: 'README.md',
    markdown: inline('Home', '```blog\nview: grid\nlimit: 9\n```'),
    shots: [
      { file: 'grid-blog' },
      { file: 'mobile-grid', width: 390 },
      { file: 'dark-grid', dark: true },
    ],
  },
  {
    name: 'grid-no-images',
    title: 'grid: media none',
    slug: '/',
    path: 'README.md',
    markdown: inline('Home', '```blog\nview: grid\nmedia: none\nlimit: 6\n```'),
    shots: [{ file: 'grid-no-images' }],
  },
  {
    name: 'grid-projects',
    title:
      'grid page: projects, ratio 4/3, no dates, status meta (one project without an image: monogram tile)',
    slug: '/projects',
    path: 'projects/README.md',
    markdown: page(
      'title: Projects\nlayout: list\nlist:\n  view: grid\n  sort: title\n  ratio: 4/3\n  fields:\n    date: none\n    eyebrow: client\n    meta: [status]',
    ),
    shots: [{ file: 'grid-projects' }, ...themeShots('grid', [['leaf', 390]])],
  },
  {
    name: 'grid-default-image',
    title:
      'grid: defaultImage for items without an image (the Themes project has none)',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'Home',
      '```list\nfrom: projects\nview: grid\nsort: title\ndefaultImage: "[[assets/changelog-click-to-enlarge-images.webp]]"\nfields:\n  date: none\n```',
    ),
    shots: [{ file: 'grid-default-image' }],
  },
  {
    name: 'grid-monogram-off',
    title:
      'grid: defaultImage: none (no monogram tiles; the Themes card is text only)',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'Home',
      '```list\nfrom: projects\nview: grid\nsort: title\ndefaultImage: none\nfields:\n  date: none\n```',
    ),
    shots: [{ file: 'grid-monogram-off' }],
  },
  {
    name: 'grid-text-only',
    title: 'grid: no item has an image (text-only cards, no media block)',
    slug: '/',
    path: 'README.md',
    markdown: inline('Notes', '```list\nfrom: notes\nview: grid\n```'),
    shots: [{ file: 'grid-text-only' }],
  },
  {
    name: 'grid-square',
    title: 'grid: ratio 1/1',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'Home',
      '```list\nfrom: projects\nview: grid\nratio: 1/1\nsort: title\nfields:\n  date: none\n```',
    ),
    shots: [{ file: 'grid-square' }],
  },
  {
    name: 'compact-archive',
    title: 'compact page: an archive grouped by year (the page-level default)',
    slug: '/journal',
    path: 'journal/README.md',
    markdown: page(
      'title: Journal\nlayout: list\nlist:\n  view: compact\n  pageSize: 50',
    ),
    shots: [
      { file: 'compact-archive' },
      { file: 'compact-archive-mobile', width: 390 },
      { file: 'dark-compact', dark: true },
      ...themeShots('compact', [['letterpress', 390]]),
    ],
  },
  {
    name: 'compact-teaser',
    title: 'compact inline: a teaser with no year headings',
    slug: '/',
    path: 'README.md',
    markdown: inline('Home', '```blog\nview: compact\nlimit: 5\n```'),
    shots: [{ file: 'compact-teaser' }],
  },
  {
    name: 'compact-category',
    title: 'compact with a category column (fields.meta)',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'Home',
      '```blog\nview: compact\nlimit: 10\nfields:\n  meta: [category]\n```',
    ),
    shots: [
      { file: 'compact-category' },
      { file: 'compact-category-mobile', width: 390 },
    ],
  },
  {
    name: 'people-team',
    title: 'people page grouped by team (photos, and initials without one)',
    slug: '/team',
    path: 'team/README.md',
    markdown: page(
      'title: Team\nlayout: list\nlist:\n  view: people\n  group: team',
    ),
    shots: [
      { file: 'people-team' },
      { file: 'people-team-mobile', width: 390 },
      { file: 'dark-people', dark: true },
      ...themeShots('people', [['leaf', 390]]),
    ],
  },
  {
    name: 'people-grid',
    title: 'people inline: 4 / 3 / 2 columns, sorted by name',
    slug: '/',
    path: 'README.md',
    markdown: inline('About us', '```list\nfrom: team\nview: people\n```'),
    shots: [{ file: 'people-grid' }],
  },
  {
    name: 'people-rows',
    title: 'people with media: thumb (avatar-left rows)',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'About us',
      '```list\nfrom: team\nview: people\nmedia: thumb\n```',
    ),
    shots: [{ file: 'people-rows' }],
  },
  {
    name: 'grid-featured',
    title:
      'grid + featured: 1 (a magazine); the featured: true post is the hero',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'Home',
      '```blog\nview: grid\nfeatured: 1\nlimit: 7\nfields:\n  eyebrow: category\n```',
    ),
    shots: [
      { file: 'grid-featured' },
      { file: 'grid-featured-mobile', width: 390 },
      { file: 'dark-featured', dark: true },
      ...themeShots('featured'),
    ],
  },
  {
    name: 'list-featured',
    title: 'list + featured: 1, inside the reading measure',
    slug: '/blog',
    path: 'blog/README.md',
    markdown: page(
      'title: Blog\nlayout: list\nlist:\n  featured: 1\n  pageSize: 6',
    ),
    shots: [
      { file: 'list-featured' },
      { file: 'list-featured-mobile', width: 390 },
    ],
  },
  {
    name: 'featured-text-only',
    title: 'featured without an image: a full-width text hero',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'Notes',
      '```list\nfrom: notes\nview: grid\nfeatured: 1\n```',
    ),
    shots: [{ file: 'featured-text-only' }],
  },
  {
    name: 'group-by-field',
    title: 'group by a field: projects by status (each group once)',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'Projects',
      '```list\nfrom: projects\nview: grid\ngroup: status\nfields:\n  date: none\n```',
    ),
    shots: [{ file: 'group-by-field' }],
  },
  {
    name: 'list-grouped-month',
    title: 'list grouped by month',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'Home',
      '```blog\ngroup: month\nmedia: none\nlimit: 10\n```',
    ),
    shots: [{ file: 'list-grouped-month' }],
  },
  {
    name: 'legacy-list',
    title:
      'Legacy MDX <List /> (no data-view): themes must keep their old look here',
    slug: '/blog',
    path: 'blog/index.mdx',
    markdown: page(
      'title: Blog',
      '<List dir="/blog" fields={["title", "description", "date", "image"]} />',
    ),
    legacy: { dir: '/blog', fields: ['title', 'description', 'date', 'image'] },
    shots: [{ file: 'legacy-list' }, ...themeShots('legacy')],
  },
  {
    name: 'error-missing-folder',
    title: 'Error: a folder that does not exist',
    slug: '/',
    path: 'README.md',
    markdown: inline('Home', '```list\nfrom: blgo\n```'),
    shots: [
      { file: 'error-missing-folder', selector: '.list-component-error' },
    ],
  },
  {
    name: 'error-invalid',
    title: 'Error: several invalid keys',
    slug: '/',
    path: 'README.md',
    markdown: inline(
      'Home',
      '```list\nfrom: blog\nperPage: 5\nimage: cover\nview: compact\n```',
    ),
    shots: [{ file: 'error-invalid', selector: '.list-component-error' }],
  },
  {
    name: 'empty',
    title: 'Empty: every page in the folder is a draft',
    slug: '/',
    path: 'README.md',
    markdown: inline('Home', '```list\nfrom: drafts\n```'),
    shots: [{ file: 'empty', selector: '#mdxpage' }],
  },
];
