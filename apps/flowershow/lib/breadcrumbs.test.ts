import { describe, expect, it } from 'vitest';
import { findBreadcrumbs, pageHeaderBreadcrumbs } from './breadcrumbs';
import type { Node } from './build-site-tree';

const file = (path: string, urlPath: string, label: string): Node => ({
  kind: 'file',
  label,
  name: path.split('/').pop()!,
  path,
  urlPath,
  metadata: null,
});

const dir = (path: string, label: string, children: Node[]): Node => ({
  kind: 'dir',
  label,
  name: path.split('/').pop()!,
  path,
  urlPath: `/${path}`,
  children,
});

const tree: Node[] = [
  dir('guides', 'Guides', [
    file('guides/README.md', '/guides', 'Guides home'),
    dir('guides/advanced', 'Advanced', [
      file('guides/advanced/README.md', '/guides/advanced', 'Advanced home'),
      file('guides/advanced/tuning.md', '/guides/advanced/tuning', 'Tuning'),
    ]),
    file('guides/install.md', '/guides/install', 'Install'),
  ]),
  dir('notes', 'Notes', [file('notes/a.md', '/notes/a', 'Note A')]),
  file('about.md', '/about', 'About'),
];

describe('findBreadcrumbs', () => {
  it('links folders only when they have an index page', () => {
    expect(findBreadcrumbs(tree, (n) => n.urlPath === '/notes/a')).toEqual([
      { label: 'Notes', href: null },
      { label: 'Note A', href: '/notes/a' },
    ]);
    expect(
      findBreadcrumbs(tree, (n) => n.urlPath === '/guides/install'),
    ).toEqual([
      { label: 'Guides', href: '/guides' },
      { label: 'Install', href: '/guides/install' },
    ]);
  });

  it('returns [] when nothing matches', () => {
    expect(findBreadcrumbs(tree, () => false)).toEqual([]);
  });
});

describe('pageHeaderBreadcrumbs', () => {
  it('shows ancestors and the current page, unlinked', () => {
    expect(
      pageHeaderBreadcrumbs({
        tree,
        pagePath: 'guides/advanced/tuning.md',
        title: 'Tuning your site',
      }),
    ).toEqual([
      { label: 'Guides', href: '/guides' },
      { label: 'Advanced', href: '/guides/advanced' },
      { label: 'Tuning your site', href: null },
    ]);
  });

  it('falls back to the tree label when there is no title', () => {
    expect(pageHeaderBreadcrumbs({ tree, pagePath: 'notes/a.md' })).toEqual([
      { label: 'Notes', href: null },
      { label: 'Note A', href: null },
    ]);
  });

  it('drops the folder crumb on its own index page', () => {
    expect(
      pageHeaderBreadcrumbs({ tree, pagePath: 'guides/advanced/README.md' }),
    ).toEqual([
      { label: 'Guides', href: '/guides' },
      { label: 'Advanced home', href: null },
    ]);
    expect(
      pageHeaderBreadcrumbs({ tree, pagePath: 'guides/README.md' }),
    ).toEqual([]);
  });

  it('returns [] for top-level pages', () => {
    expect(pageHeaderBreadcrumbs({ tree, pagePath: 'about.md' })).toEqual([]);
  });

  it('uses frontmatter section in place of folder ancestors', () => {
    expect(
      pageHeaderBreadcrumbs({
        tree,
        pagePath: 'about.md',
        title: 'Guide',
        section: 'Use it',
      }),
    ).toEqual([
      { label: 'Use it', href: null },
      { label: 'Guide', href: null },
    ]);
    expect(
      pageHeaderBreadcrumbs({
        tree,
        pagePath: 'guides/install.md',
        section: '  Use it ',
      }),
    ).toEqual([
      { label: 'Use it', href: null },
      { label: 'Install', href: null },
    ]);
  });

  it('works without a site tree when section is set', () => {
    expect(
      pageHeaderBreadcrumbs({
        tree: [],
        pagePath: 'guide.md',
        section: 'Use it',
      }),
    ).toEqual([
      { label: 'Use it', href: null },
      { label: 'guide.md', href: null },
    ]);
  });

  it('ignores non-string or blank section values', () => {
    expect(
      pageHeaderBreadcrumbs({ tree, pagePath: 'about.md', section: 42 }),
    ).toEqual([]);
    expect(
      pageHeaderBreadcrumbs({ tree, pagePath: 'about.md', section: '  ' }),
    ).toEqual([]);
  });
});
