/**
 * A small in-memory Flowershow site for the listing preview: real changelog
 * entries, images and author pages from content/flowershow-app, plus generated
 * older posts for pagination. Rows have the shape lib/listing/query.ts selects.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { encodeSlug, filePathToSlug } from '@flowershow/core';
import matter from 'gray-matter';

export const SITE_HOSTNAME = 'preview.flowershow.local';
export const CONTENT_DIR = path.resolve(
  __dirname,
  '../../../../content/flowershow-app',
);

export type Row = {
  id: string;
  path: string;
  appPath: string;
  permalink: null;
  metadata: Record<string, unknown>;
};

/** Real changelog entries, newest last in the folder; frontmatter as published. */
function realEntries(): Array<{ name: string; data: Record<string, unknown> }> {
  const dir = path.join(CONTENT_DIR, 'changelog');
  return readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(f))
    .map((f) => {
      const data = matter(readFileSync(path.join(dir, f), 'utf8')).data;
      // gray-matter parses `date: 2026-10-05` as a Date; ingestion stores the string.
      if (data.date instanceof Date)
        data.date = data.date.toISOString().slice(0, 10);
      return { name: f.replace(/\.md$/, ''), data };
    });
}

const OLDER_TOPICS = [
  [
    'Faster builds for large vaults',
    'Sites with thousands of notes now publish in a fraction of the time.',
  ],
  [
    'Custom domains with automatic HTTPS',
    'Point your domain at Flowershow and certificates are issued and renewed for you.',
  ],
  [
    'Full-text search for every site',
    'Visitors can search titles and page text from the navbar.',
  ],
  [
    'Comments with Giscus',
    'Turn on comments and each page gets a discussion backed by GitHub.',
  ],
  [
    'Sidebar ordering by frontmatter',
    'Order the sidebar by title, date or a custom field.',
  ],
  [
    'Better embeds for YouTube and tweets',
    'Paste a link on its own line and it becomes an embed.',
  ],
  [
    'Obsidian callouts, folded and nested',
    'Callouts keep their icons, colours and fold state.',
  ],
  [
    'Wiki links that survive renames',
    'Links resolve by shortest path, so moving a file keeps them working.',
  ],
  ['Analytics without cookies', 'Add Umami or Plausible from the dashboard.'],
  ['Math with KaTeX', 'Inline and display math render on the server.'],
];
const DAY = 86_400_000;

function olderPosts(
  folder: string,
  n: number,
  from: string,
  authors: string[] = ['olayway'],
): Row[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const [title, description] = OLDER_TOPICS[i % OLDER_TOPICS.length]!;
    const date = new Date(start - (i + 1) * 3 * DAY).toISOString().slice(0, 10);
    return row(`${folder}/${date}-older-${i + 1}.md`, {
      title,
      date,
      description,
      authors,
    });
  });
}

let nextId = 1;
function row(p: string, metadata: Record<string, unknown>): Row {
  return {
    id: String(nextId++),
    path: p,
    appPath: encodeSlug(filePathToSlug(p)),
    permalink: null,
    metadata,
  };
}

/** Real image files copied into the preview's site/ folder (served where the resolved URLs point). */
export const ASSETS: Array<[from: string, to: string]> = [
  ...readdirSync(path.join(CONTENT_DIR, 'assets'))
    .filter((f) => /^changelog-.*\.webp$/.test(f))
    .map((f) => [`assets/${f}`, `assets/${f}`] as [string, string]),
  ['people/rufuspollock.jpeg', 'people/rufuspollock.jpeg'],
  ['people/olayway.jpeg', 'people/olayway.jpeg'],
  ['people/abeelha.jpg', 'people/abeelha.jpg'],
];

const img = (f: string) => `[[assets/changelog-${f}.webp]]`;

/** The blog/ post that carries `featured: true` (the featured: 1 hero). */
const FEATURED_POST = '2026-10-03-publish-from-claude-and-chatgpt';
function categoryFor(name: string): string {
  if (/publish|account|claude|email|sign-in/.test(name)) return 'Publishing';
  if (/theme|footer|customize|breadcrumb|social|head|script|reading/.test(name))
    return 'Customization';
  if (/markdown|mermaid|bases|math|prose|currency|tags|file|image/.test(name))
    return 'Markdown';
  return 'Product';
}

/** Team pages: the three local photos plus people without one (initials). */
const TEAM: Array<[string, Record<string, unknown>]> = [
  [
    'rufus-pollock',
    {
      title: 'Rufus Pollock',
      role: 'Founder',
      team: 'Leadership',
      avatar: '[[people/rufuspollock.jpeg]]',
      bio: 'Founder of Open Knowledge Foundation and Datopian.',
    },
  ],
  [
    'ola-rubaj',
    {
      title: 'Ola Rubaj',
      role: 'Developer',
      team: 'Engineering',
      avatar: '[[people/olayway.jpeg]]',
      bio: 'Makes Flowershow easy for people with no technical background.',
    },
  ],
  [
    'abeelha',
    {
      title: 'Abeelha',
      role: 'Developer',
      team: 'Engineering',
      avatar: '[[people/abeelha.jpg]]',
      bio: 'Builds Flowershow, and loves bees.',
    },
  ],
  [
    'grace-hopper',
    {
      title: 'Grace Hopper',
      role: 'Compilers',
      team: 'Engineering',
      bio: 'Wrote the first compiler and popularised machine-independent languages.',
    },
  ],
  [
    'ada-lovelace',
    {
      title: 'Ada Lovelace',
      role: 'Analytical engines',
      team: 'Research',
      bio: 'Published the first algorithm intended for a machine.',
    },
  ],
  [
    'katherine-johnson',
    {
      title: 'Katherine Johnson',
      role: 'Orbital mechanics',
      team: 'Research',
      bio: 'Calculated the trajectories for the first American crewed flights.',
    },
  ],
  [
    'alan-turing',
    {
      title: 'Alan Turing',
      role: 'Computation',
      team: 'Research',
      bio: 'Defined what it means for a machine to compute.',
    },
  ],
];

export function buildSite(): { rows: Row[]; files: string[] } {
  nextId = 1;
  const real = realEntries();
  const rows: Row[] = [];
  const copy = (folder: string) =>
    real.map((e) => row(`${folder}/${e.name}.md`, { ...e.data }));

  // blog/: zero-config, no README (case 1); 28 posts = 2 pages of 20.
  // A category for eyebrows/columns/grouping, and one featured: true post.
  rows.push(
    ...copy('blog').map((r) => {
      const name = r.path.slice('blog/'.length);
      r.metadata.category = categoryFor(name);
      if (name.startsWith(FEATURED_POST)) r.metadata.featured = true;
      return r;
    }),
    ...olderPosts('blog', 28 - real.length, '2026-09-19'),
  );
  // posts/: prose-only README (case 2)
  rows.push(row('posts/README.md', { title: 'Posts' }), ...copy('posts'));
  // archive/: layout: list with 240 posts = 12 pages
  rows.push(
    row('archive/README.md', { title: 'Archive', layout: 'list' }),
    ...copy('archive'),
    ...olderPosts('archive', 240 - real.length, '2026-09-19'),
  );
  // essays/: long titles
  rows.push(
    row('essays/one.md', {
      title:
        'Why every research group should publish its notes as a website, and how to do it in an afternoon without a developer',
      date: '2026-10-02',
      description:
        'A practical case for open notebooks, from a lab that tried it for a year.',
      image: img('publish-with-ai'),
      authors: ['rufuspollock'],
    }),
    row('essays/two.md', {
      title:
        'Antidisestablishmentarianism-and-other-unbreakable-words-in-titles-should-wrap-not-overflow',
      date: '2026-09-28',
      description: 'An unbroken title must wrap inside its column.',
      image: img('file-types'),
      authors: ['olayway'],
    }),
    row('essays/three.md', {
      title: 'Short title',
      date: '2026-09-20',
      description:
        'For contrast with the long ones above. The summary is long enough to be clamped at two lines in the list view, so this sentence keeps going for a while longer than it needs to, and then some more.',
      image: img('social-preview-cards'),
      authors: ['rufuspollock'],
    }),
  );
  // notes/: no descriptions, no images
  for (const [i, t] of [
    'Reading list for October',
    'Notes from the Obsidian meetup',
    'A tiny CSS trick for callouts',
    'What we learned shipping annotations',
    'Weeknotes 41',
  ].entries())
    rows.push(
      row(`notes/note-${i + 1}.md`, { title: t, date: `2026-10-0${9 - i}` }),
    );
  // field-notes/: 1, 2, 3 and 4 authors, one unresolved
  const authorSets = [
    ['rufuspollock'],
    ['rufuspollock', 'olayway'],
    ['olayway', 'abeelha', 'rufuspollock'],
    ['abeelha', 'olayway', 'rufuspollock', 'Guest Writer'],
  ];
  const fieldImages = [
    'annotations',
    'breadcrumbs',
    'customize-your-site',
    'publish-without-an-account',
  ];
  for (const [i, authors] of authorSets.entries())
    rows.push(
      row(`field-notes/post-${i + 1}.md`, {
        title: [
          'Solo: shipping the CLI',
          'Pairing on the renderer',
          'Three of us on themes',
          'A team retro, with a guest',
        ][i],
        date: `2026-10-0${8 - i}`,
        description: `Written by ${authors.length} ${authors.length === 1 ? 'person' : 'people'}.`,
        authors,
        image: img(fieldImages[i]!),
      }),
    );
  // projects/: layout: list as a grid (rendered by the scenarios)
  rows.push(
    row('projects/README.md', { title: 'Projects', layout: 'list' }),
    row('projects/flowershow.md', {
      title: 'Flowershow',
      description: 'Turn Markdown into a website in seconds.',
      image: img('publish-with-ai'),
      status: 'In progress',
      client: 'Open source',
    }),
    row('projects/annotations.md', {
      title: 'Annotations',
      description: 'Select text on any page and leave a note.',
      image: img('annotations'),
      status: 'Shipped',
      client: 'Flowershow',
    }),
    row('projects/connector.md', {
      title: 'Claude and ChatGPT connector',
      description: 'Publish from a chat with no install.',
      image: img('publish-from-claude-and-chatgpt'),
      status: 'Beta',
      client: 'Flowershow',
    }),
    row('projects/themes.md', {
      title: 'Themes',
      description: 'Six official themes on one stable class contract.',
      status: 'Shipped',
      client: 'Community',
    }),
    row('projects/social-cards.md', {
      title: 'Social preview cards',
      description: 'A generated card for every page.',
      image: img('social-preview-cards'),
      status: 'Shipped',
      client: 'Flowershow',
    }),
    row('projects/breadcrumbs.md', {
      title: 'Breadcrumbs',
      description: 'Where a page sits, above its title.',
      image: img('breadcrumbs'),
      status: 'Shipped',
      client: 'Flowershow',
    }),
  );
  // drafts/: every page is a draft, so a list of it is empty
  rows.push(
    row('drafts/idea.md', {
      title: 'Half an idea',
      date: '2026-10-01',
      draft: true,
    }),
  );
  // people/: author pages with local avatars (the real pages point at GitHub avatars)
  rows.push(
    row('people/rufuspollock.md', {
      title: 'Rufus Pollock',
      avatar: '[[people/rufuspollock.jpeg]]',
    }),
    row('people/olayway.md', {
      title: 'Ola Rubaj',
      avatar: '[[people/olayway.jpeg]]',
    }),
    row('people/abeelha.md', {
      title: 'Abeelha',
      avatar: '[[people/abeelha.jpg]]',
    }),
  );
  // journal/: ~4 years of monthly posts for the compact archive (year groups)
  rows.push(row('journal/README.md', { title: 'Journal', layout: 'list' }));
  for (let i = 0; i < 44; i++) {
    const [title] = OLDER_TOPICS[i % OLDER_TOPICS.length]!;
    const date = new Date(Date.parse('2026-10-04T00:00:00Z') - i * 33 * DAY)
      .toISOString()
      .slice(0, 10);
    rows.push(
      row(`journal/${date}-entry.md`, {
        title: i % 3 === 1 ? `Notes: ${title.toLowerCase()}` : title,
        date,
        category: ['Product', 'Engineering', 'Community'][i % 3],
      }),
    );
  }
  // team/: one page per person; some with photos, some without (initials)
  rows.push(
    row('team/README.md', { title: 'Team', layout: 'list' }),
    ...TEAM.map(([file, data]) => row(`team/${file}.md`, data)),
  );
  rows.push(row('README.md', { title: 'Home' }));

  const files = [
    ...rows.map((r) => `/${r.path}`),
    ...ASSETS.map(([, to]) => `/${to}`),
  ];
  return { rows, files };
}

/** Enough of Prisma's blob.findMany for lib/listing/query.ts and lib/listing/authors.ts. */
export function fakeDb(rows: Row[]) {
  const matchPath = (cond: unknown, p: string): boolean => {
    if (typeof cond === 'string') return p === cond;
    const c = cond as { startsWith?: string; endsWith?: string };
    if (c.startsWith != null && !p.startsWith(c.startsWith)) return false;
    if (c.endsWith != null && !p.endsWith(c.endsWith)) return false;
    return true;
  };
  return {
    blob: {
      findMany: async ({ where }: { where: Record<string, any> }) =>
        rows.filter((r) => {
          if (where.id?.in && !where.id.in.includes(r.id)) return false;
          if (
            where.extension?.in &&
            !where.extension.in.includes(r.path.split('.').pop())
          )
            return false;
          if (where.path && !matchPath(where.path, r.path)) return false;
          if (where.OR && !where.OR.some((o: any) => matchPath(o.path, r.path)))
            return false;
          return true;
        }),
    },
  };
}
