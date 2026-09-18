import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ChangelogEntryMeta } from '@/lib/changelog';
import { ChangelogEntry } from './changelog-entry';
import { ChangelogEntryNav } from './changelog-entry-nav';
import { ChangelogIndex } from './changelog-index';
import { ChangelogPagination } from './changelog-pagination';

afterEach(cleanup);

const entry: ChangelogEntryMeta = {
  id: 'e1',
  path: 'changelog/2026-08-21-monospace-theme.md',
  url: '/changelog/2026-08-21-monospace-theme',
  anchor: '2026-08-21-monospace-theme',
  title: 'Monospace theme is now available',
  date: '2026-08-21',
  version: '2.4.0',
  description: 'Choose the compact Monospace theme.',
  image: 'https://example.com/shot.png',
  authors: ['olayway'],
};
const authors = [
  {
    key: 'b1',
    name: 'Ola Rubaj',
    url: '/people/olayway',
    avatar: 'https://example.com/a.png',
  },
];

describe('ChangelogEntry (index variant)', () => {
  it('renders anchor, date, version, authors, linked title, description, media and body', () => {
    const { container } = render(
      <ol>
        <ChangelogEntry entry={entry} authors={authors} variant="index">
          <p>Body text</p>
        </ChangelogEntry>
      </ol>,
    );
    const li = container.querySelector('li.changelog-entry')!;
    expect(li.id).toBe('2026-08-21-monospace-theme');
    expect(
      container
        .querySelector('.changelog-entry-date time')!
        .getAttribute('datetime'),
    ).toBe('2026-08-21');
    expect(
      container.querySelector('.changelog-entry-date')!.getAttribute('href'),
    ).toBe('#2026-08-21-monospace-theme');
    expect(screen.getByText('Aug 21, 2026')).toBeInTheDocument();
    expect(screen.getByText('2.4.0')).toHaveClass('changelog-entry-version');
    expect(screen.getByText('Ola Rubaj').closest('a')).toHaveAttribute(
      'href',
      '/people/olayway',
    );
    expect(
      screen
        .getByRole('heading', { level: 2, name: entry.title })
        .querySelector('a'),
    ).toHaveAttribute('href', entry.url);
    expect(screen.getByText(entry.description!)).toHaveClass(
      'changelog-entry-description',
    );
    expect(
      container.querySelector('.changelog-entry-media img'),
    ).toHaveAttribute('src', entry.image);
    expect(container.querySelector('.changelog-entry-body')!.textContent).toBe(
      'Body text',
    );
  });

  it('omits optional parts when absent', () => {
    const bare = {
      ...entry,
      date: null,
      version: undefined,
      description: undefined,
      image: undefined,
      authors: [],
    };
    const { container } = render(
      <ol>
        <ChangelogEntry entry={bare} authors={[]} variant="index">
          x
        </ChangelogEntry>
      </ol>,
    );
    expect(container.querySelector('.changelog-entry-date')).toBeNull();
    expect(container.querySelector('.changelog-entry-version')).toBeNull();
    expect(container.querySelector('.changelog-entry-authors')).toBeNull();
    expect(container.querySelector('.changelog-entry-media')).toBeNull();
  });
});

describe('ChangelogEntry (page variant)', () => {
  it('renders an h1, a back link and no self-link', () => {
    const { container } = render(
      <ChangelogEntry
        entry={entry}
        authors={authors}
        variant="page"
        indexUrl="/changelog"
      >
        Body
      </ChangelogEntry>,
    );
    expect(container.querySelector('article.changelog-single')).not.toBeNull();
    expect(
      screen
        .getByRole('heading', { level: 1, name: entry.title })
        .querySelector('a'),
    ).toBeNull();
    expect(screen.getByText('← Changelog')).toHaveAttribute(
      'href',
      '/changelog',
    );
  });
});

describe('ChangelogPagination', () => {
  it('links to older and newer pages', () => {
    render(
      <ChangelogPagination
        baseUrl="/changelog"
        page={2}
        pageCount={3}
        shown={10}
        total={23}
      />,
    );
    expect(screen.getByText('Older updates →')).toHaveAttribute(
      'href',
      '/changelog?page=3',
    );
    expect(screen.getByText('← Newer updates')).toHaveAttribute(
      'href',
      '/changelog',
    );
    expect(screen.getByText('Page 2 of 3 · 23 updates')).toBeInTheDocument();
  });
  it('renders nothing when there is a single page', () => {
    const { container } = render(
      <ChangelogPagination
        baseUrl="/changelog"
        page={1}
        pageCount={1}
        shown={3}
        total={3}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('ChangelogEntryNav', () => {
  it('shows previous (older) and next (newer) links', () => {
    render(
      <ChangelogEntryNav
        older={{ ...entry, title: 'Older one', url: '/changelog/old' }}
        newer={{ ...entry, title: 'Newer one', url: '/changelog/new' }}
      />,
    );
    expect(screen.getByText('Older one').closest('a')).toHaveAttribute(
      'href',
      '/changelog/old',
    );
    expect(screen.getByText('Newer one').closest('a')).toHaveAttribute(
      'href',
      '/changelog/new',
    );
  });
});

describe('ChangelogIndex', () => {
  it('renders the title, intro, entries list and pagination slot', () => {
    const { container } = render(
      <ChangelogIndex
        title="Changelog"
        intro={<p>Intro</p>}
        pagination={<nav>pager</nav>}
      >
        <li>one</li>
      </ChangelogIndex>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Changelog' }),
    ).toHaveClass('changelog-title');
    expect(container.querySelector('.changelog-intro')!.textContent).toBe(
      'Intro',
    );
    expect(
      container.querySelector('ol.changelog-entries li')!.textContent,
    ).toBe('one');
    expect(screen.getByText('pager')).toBeInTheDocument();
  });
});
