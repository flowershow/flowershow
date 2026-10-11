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
  shots?: Shot[];
};

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
      { file: 'theme-lessflowery-list', theme: 'lessflowery' },
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
      { file: 'theme-lessflowery-grid', theme: 'lessflowery' },
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
      'grid page: projects, ratio 4/3, no dates, status meta (one project without an image)',
    slug: '/projects',
    path: 'projects/README.md',
    markdown: page(
      'title: Projects\nlayout: list\nlist:\n  view: grid\n  sort: title\n  ratio: 4/3\n  fields:\n    date: none\n    eyebrow: client\n    meta: [status]',
    ),
    shots: [{ file: 'grid-projects' }],
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

/** Official themes copied into the preview (all six are linkable; screenshots use the ones named in `shots`). */
export const THEMES = [
  'leaf',
  'lessflowery',
  'letterpress',
  'superstack',
  'monospace',
  'material-draft',
];
