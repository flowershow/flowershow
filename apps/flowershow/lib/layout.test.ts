import { describe, expect, it } from 'vitest';
import {
  pageLayout,
  resolveLayout,
  type LayoutInputs,
  type ResolvedLayout,
} from './layout';

// Docs, sidebar on, toc on, rail style off, 5 headings, graph off
const base: LayoutInputs = {
  layout: 'docs',
  sidebarEnabled: true,
  pageShowsSidebar: undefined,
  showToc: true,
  tocStyle: 'panel',
  pageTocStyle: undefined,
  tocHeadings: 5,
  showGraph: false,
  pageShowsGraph: undefined,
};

const docsDefault: ResolvedLayout = {
  sidebar: 'column',
  toc: 'panel',
  showGraph: false,
  pageNav: false,
  railColumn: false,
  inlineTocStyle: 'panel',
};

describe('resolveLayout', () => {
  it.each<[string, Partial<LayoutInputs>, Partial<ResolvedLayout>]>([
    ['docs default', {}, {}],
    [
      'docs rail style',
      { tocStyle: 'rail' },
      { toc: 'rail-right', railColumn: true, inlineTocStyle: 'rail' },
    ],
    [
      'docs rail, 2 headings',
      { tocStyle: 'rail', tocHeadings: 2 },
      { toc: 'none' },
    ],
    [
      'docs rail with graph',
      { tocStyle: 'rail', showGraph: true },
      { toc: 'rail-right', showGraph: true },
    ],
    ['docs, sidebar off', { sidebarEnabled: false }, { sidebar: 'none' }],
    [
      'reading',
      { layout: 'reading' },
      {
        sidebar: 'drawer',
        toc: 'rail-left',
        pageNav: true,
        railColumn: true,
        inlineTocStyle: 'rail',
      },
    ],
    [
      'reading, site toc panel',
      { layout: 'reading', tocStyle: 'panel' },
      {
        sidebar: 'drawer',
        toc: 'rail-left',
        pageNav: true,
        railColumn: true,
        inlineTocStyle: 'rail',
      },
    ],
    [
      'reading, page toc panel',
      { layout: 'reading', pageTocStyle: 'panel', tocStyle: 'panel' },
      { sidebar: 'drawer', toc: 'panel', pageNav: true },
    ],
    [
      'reading, 2 headings',
      { layout: 'reading', tocHeadings: 2 },
      { sidebar: 'drawer', toc: 'none', pageNav: true },
    ],
    [
      'reading, sidebar off',
      { layout: 'reading', sidebarEnabled: false },
      {
        sidebar: 'none',
        toc: 'rail-left',
        railColumn: true,
        inlineTocStyle: 'rail',
      },
    ],
    [
      'reading, page sidebar on',
      { layout: 'reading', pageShowsSidebar: true },
      {
        sidebar: 'column',
        toc: 'rail-right',
        railColumn: true,
        inlineTocStyle: 'rail',
      },
    ],
    [
      'reading, toc off',
      { layout: 'reading', showToc: false },
      { sidebar: 'drawer', toc: 'none', pageNav: true },
    ],
    [
      'reading, site graph on',
      { layout: 'reading', showGraph: true },
      {
        sidebar: 'drawer',
        toc: 'rail-left',
        showGraph: false,
        pageNav: true,
        railColumn: true,
        inlineTocStyle: 'rail',
      },
    ],
    [
      'reading, page graph on',
      { layout: 'reading', showGraph: true, pageShowsGraph: true },
      { sidebar: 'drawer', toc: 'rail-right', showGraph: true, pageNav: true },
    ],
  ])('%s', (_name, inputs, expected) => {
    expect(resolveLayout({ ...base, ...inputs })).toEqual({
      ...docsDefault,
      ...expected,
    });
  });
});

describe('pageLayout', () => {
  it('lets a valid page value win over the site', () => {
    expect(pageLayout('reading', 'docs')).toBe('reading');
    expect(pageLayout('docs', 'reading')).toBe('docs');
  });

  it('ignores an invalid page value and falls through to the site', () => {
    expect(pageLayout('list', 'reading')).toBe('reading');
  });

  it('defaults to docs', () => {
    expect(pageLayout(undefined, 'nonsense')).toBe('docs');
  });
});
