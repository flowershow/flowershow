import { describe, expect, it } from 'vitest';
import {
  anchorFromPath,
  type ChangelogBlobRow,
  dirOf,
  entryDateFromPath,
  entryTitleFromPath,
  findChangelogFile,
  formatChangelogDate,
  hasMarkdownInDir,
  isChangelogDir,
  isChangelogDirName,
  isChangelogFileName,
  isFolderIndexPath,
  neighbours,
  normalizeDir,
  paginate,
  parsePageParam,
  resolveEntryDate,
  resolveEntryTitle,
  toChangelogEntries,
} from './changelog';

function row(
  path: string,
  metadata: Record<string, unknown> | null = {},
  extra: Partial<ChangelogBlobRow> = {},
): ChangelogBlobRow {
  return {
    id: `id-${path}`,
    path,
    appPath:
      '/' + path.replace(/\.mdx?$/, '').replace(/\/(README|index)$/i, ''),
    permalink: null,
    metadata: metadata as ChangelogBlobRow['metadata'],
    ...extra,
  };
}

describe('path helpers', () => {
  it('normalizeDir strips leading and trailing slashes', () => {
    expect(normalizeDir('/changelog/')).toBe('changelog');
    expect(normalizeDir('docs/changelog')).toBe('docs/changelog');
    expect(normalizeDir('/')).toBe('');
  });
  it('dirOf returns the parent directory', () => {
    expect(dirOf('changelog/2026-01-01-a.md')).toBe('changelog');
    expect(dirOf('README.md')).toBe('');
  });
  it('isFolderIndexPath matches README and index md/mdx', () => {
    expect(isFolderIndexPath('changelog/README.md')).toBe(true);
    expect(isFolderIndexPath('changelog/index.mdx')).toBe(true);
    expect(isFolderIndexPath('changelog/readme.md')).toBe(true);
    expect(isFolderIndexPath('changelog/2026-01-01-index-page.md')).toBe(false);
  });
});

describe('detection', () => {
  it('recognises a folder named changelog, case-insensitively, at any depth', () => {
    expect(isChangelogDirName('changelog')).toBe(true);
    expect(isChangelogDirName('/Changelog/')).toBe(true);
    expect(isChangelogDirName('docs/changelog')).toBe(true);
    expect(isChangelogDirName('changelogs')).toBe(false);
    expect(isChangelogDirName('blog')).toBe(false);
  });
  it('layout: changelog opts any folder in', () => {
    expect(isChangelogDir('releases', { layout: 'changelog' })).toBe(true);
  });
  it('any other explicit layout opts a changelog folder out', () => {
    expect(isChangelogDir('changelog', { layout: 'default' })).toBe(false);
    expect(isChangelogDir('changelog', { layout: 'plain' })).toBe(false);
  });
  it('no README metadata falls back to the folder name', () => {
    expect(isChangelogDir('changelog', null)).toBe(true);
    expect(isChangelogDir('blog', undefined)).toBe(false);
  });
});

describe('dates and titles', () => {
  it('entryDateFromPath reads a YYYY-MM-DD filename prefix', () => {
    expect(entryDateFromPath('changelog/2026-08-21-monospace-theme.md')).toBe(
      '2026-08-21',
    );
    expect(entryDateFromPath('changelog/monospace-theme.md')).toBeNull();
  });
  it('resolveEntryDate prefers valid frontmatter, falls back to filename', () => {
    expect(resolveEntryDate('2026-08-21T00:00:00.000Z', 'changelog/x.md')).toBe(
      '2026-08-21',
    );
    expect(resolveEntryDate('not a date', 'changelog/2026-01-02-x.md')).toBe(
      '2026-01-02',
    );
    expect(resolveEntryDate(undefined, 'changelog/x.md')).toBeNull();
  });
  it('entryTitleFromPath strips the date prefix and humanises', () => {
    expect(entryTitleFromPath('changelog/2026-08-21-monospace-theme.md')).toBe(
      'Monospace theme',
    );
    expect(entryTitleFromPath('changelog/new_editor.md')).toBe('New editor');
  });
  it('resolveEntryTitle keeps a real frontmatter title', () => {
    expect(
      resolveEntryTitle('Monospace theme', 'changelog/2026-08-21-monospace.md'),
    ).toBe('Monospace theme');
  });
  it('resolveEntryTitle derives a title when there is none', () => {
    expect(
      resolveEntryTitle(undefined, 'changelog/2026-03-01-new-editor.md'),
    ).toBe('New editor');
    expect(resolveEntryTitle('', 'changelog/2026-03-01-new-editor.md')).toBe(
      'New editor',
    );
  });
  it('resolveEntryTitle treats a title that is just the file name as missing', () => {
    // the sync fills metadata.title from the file name when there is no frontmatter title
    expect(
      resolveEntryTitle(
        '2026-03-01-no-frontmatter-title',
        'changelog/2026-03-01-no-frontmatter-title.md',
      ),
    ).toBe('No frontmatter title');
    expect(
      resolveEntryTitle(
        '2026-03-01-no-frontmatter-title.md',
        'changelog/2026-03-01-no-frontmatter-title.md',
      ),
    ).toBe('No frontmatter title');
  });
  it('anchorFromPath is a URL-safe filename slug', () => {
    expect(anchorFromPath('changelog/2026-08-21-Monospace Theme.md')).toBe(
      '2026-08-21-monospace-theme',
    );
  });
});

describe('toChangelogEntries', () => {
  const rows = [
    row('changelog/README.md', { title: 'Changelog' }),
    row('changelog/2026-01-10-b.md', {
      title: 'B',
      date: '2026-01-10T00:00:00.000Z',
      authors: ['olayway'],
      version: '1.1.0',
    }),
    row('changelog/2026-03-01-c.md', { title: 'C' }),
    row('changelog/undated.md', { title: 'Undated' }),
    row('changelog/2026-02-01-hidden.md', { title: 'Hidden', publish: false }),
    row('changelog/sub/2026-05-01-nested.md', { title: 'Nested' }),
    row('changelog/image.png', null),
    row('blog/2026-04-01-other.md', { title: 'Other' }),
  ];

  it('keeps direct md children only, excludes README, unpublished, nested and other folders', () => {
    const titles = toChangelogEntries(rows, 'changelog').map((e) => e.title);
    expect(titles).toEqual(['C', 'B', 'Undated']);
  });
  it('derives a readable title when the stored title is just the file name', () => {
    const titles = toChangelogEntries(
      [
        row('changelog/2026-03-01-no-frontmatter-title.md', {
          title: '2026-03-01-no-frontmatter-title',
        }),
      ],
      'changelog',
    ).map((e) => e.title);
    expect(titles).toEqual(['No frontmatter title']);
  });
  it('sorts by date desc with undated last', () => {
    const dates = toChangelogEntries(rows, '/changelog/').map((e) => e.date);
    expect(dates).toEqual(['2026-03-01', '2026-01-10', null]);
  });
  it('maps metadata fields and url', () => {
    const b = toChangelogEntries(rows, 'changelog').find(
      (e) => e.title === 'B',
    )!;
    expect(b).toMatchObject({
      id: 'id-changelog/2026-01-10-b.md',
      url: '/changelog/2026-01-10-b',
      anchor: '2026-01-10-b',
      authors: ['olayway'],
      version: '1.1.0',
    });
  });
  it('prefers permalink for url and normalises scalar authors', () => {
    const [e] = toChangelogEntries(
      [
        row(
          'changelog/2026-01-01-a.md',
          { title: 'A', authors: 'Jane' },
          { permalink: '/news/a' },
        ),
      ],
      'changelog',
    );
    expect(e!.url).toBe('/news/a');
    expect(e!.authors).toEqual(['Jane']);
  });
  it('falls back to a humanised filename title', () => {
    const [e] = toChangelogEntries(
      [row('changelog/2026-01-01-dark-mode.md', {})],
      'changelog',
    );
    expect(e!.title).toBe('Dark mode');
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  it('slices pages', () => {
    expect(paginate(items, 1, 10)).toEqual({
      items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      page: 1,
      pageCount: 3,
      total: 23,
    });
    expect(paginate(items, 3, 10)!.items).toEqual([20, 21, 22]);
  });
  it('returns null out of range', () => {
    expect(paginate(items, 4, 10)).toBeNull();
    expect(paginate(items, 0, 10)).toBeNull();
  });
  it('allows page 1 of an empty list', () => {
    expect(paginate([], 1, 10)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
  });
});

describe('parsePageParam', () => {
  it('parses positive integers and defaults to 1', () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam('2')).toBe(2);
    expect(parsePageParam(['3', '4'])).toBe(3);
  });
  it('rejects junk', () => {
    expect(parsePageParam('0')).toBeNull();
    expect(parsePageParam('-1')).toBeNull();
    expect(parsePageParam('abc')).toBeNull();
    expect(parsePageParam('1.5')).toBeNull();
  });
});

describe('neighbours', () => {
  it('returns newer and older entries around a path', () => {
    const entries = toChangelogEntries(
      [
        row('changelog/2026-01-01-a.md', { title: 'A' }),
        row('changelog/2026-02-01-b.md', { title: 'B' }),
        row('changelog/2026-03-01-c.md', { title: 'C' }),
      ],
      'changelog',
    );
    const n = neighbours(entries, 'changelog/2026-02-01-b.md');
    expect(n.newer?.title).toBe('C');
    expect(n.older?.title).toBe('A');
    expect(neighbours(entries, 'changelog/2026-03-01-c.md').newer).toBeNull();
    expect(neighbours(entries, 'missing.md')).toEqual({
      newer: null,
      older: null,
    });
  });
});

describe('isChangelogFileName', () => {
  it('matches changelog.md/mdx in any case, anywhere', () => {
    expect(isChangelogFileName('CHANGELOG.md')).toBe(true);
    expect(isChangelogFileName('packages/cli/changelog.md')).toBe(true);
    expect(isChangelogFileName('docs/Changelog.mdx')).toBe(true);
  });
  it('rejects other names and folder entries', () => {
    expect(isChangelogFileName('changelog/2026-01-01-a.md')).toBe(false);
    expect(isChangelogFileName('HISTORY.md')).toBe(false);
    expect(isChangelogFileName('changelogs.md')).toBe(false);
  });
});

describe('formatChangelogDate', () => {
  it('formats ISO dates in UTC, en-US short', () => {
    expect(formatChangelogDate('2026-08-21')).toBe('Aug 21, 2026');
  });
});

describe('hasMarkdownInDir', () => {
  it('is true when markdown sits directly in dir', () => {
    expect(hasMarkdownInDir('changelog', ['changelog/2026-01-01-a.md'])).toBe(
      true,
    );
    expect(hasMarkdownInDir('/changelog/', ['/changelog/README.mdx'])).toBe(
      true,
    );
  });
  it('is case-sensitive and ignores nested or non-markdown files', () => {
    expect(hasMarkdownInDir('changelog', ['Changelog/a.md'])).toBe(false);
    expect(hasMarkdownInDir('changelog', ['changelog/img/a.md'])).toBe(false);
    expect(hasMarkdownInDir('changelog', ['changelog/a.png'])).toBe(false);
    expect(hasMarkdownInDir('changelog', ['CHANGELOG.md'])).toBe(false);
  });
});

describe('findChangelogFile', () => {
  it('finds changelog.md/mdx in dir in any case', () => {
    expect(findChangelogFile('', ['README.md', 'CHANGELOG.md'])).toBe(
      'CHANGELOG.md',
    );
    expect(
      findChangelogFile('packages/cli', ['/packages/cli/Changelog.mdx']),
    ).toBe('packages/cli/Changelog.mdx');
  });
  it('returns null when there is none in that dir', () => {
    expect(findChangelogFile('', ['packages/cli/CHANGELOG.md'])).toBeNull();
    expect(findChangelogFile('docs', ['CHANGELOG.md'])).toBeNull();
  });
});
