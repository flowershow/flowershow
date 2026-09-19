import { render } from '@testing-library/react';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { ChangelogEntry } from '@/components/public/changelog/changelog-entry';
import { ChangelogIndex } from '@/components/public/changelog/changelog-index';
import remarkChangelog from './remark-changelog';

async function html(md: string, title?: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkChangelog, { title })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md);
  const doc = new DOMParser().parseFromString(String(file), 'text/html');
  return doc.body;
}

const KAC = `# Changelog

All notable changes to this project.

## [Unreleased]

## [1.1.0] - 2026-02-03

### Added

- New thing, see [1.1.0].

## [1.0.0] - 2026-01-02

- First.

[1.1.0]: https://example.com/compare/v1.0.0...v1.1.0
`;

describe('remarkChangelog', () => {
  it('builds the v1 changelog DOM', async () => {
    const body = await html(KAC);
    expect(
      body.querySelector(
        '.changelog > header.changelog-header h1.changelog-title',
      )!.textContent,
    ).toBe('Changelog');
    expect(
      body.querySelector('.changelog-intro.rendered-mdx')!.textContent,
    ).toContain('All notable changes');
    const entries = body.querySelectorAll(
      'ol.changelog-entries > li.changelog-entry',
    );
    expect(entries).toHaveLength(2); // empty Unreleased skipped
    expect(entries[0]!.id).toBe('1.1.0');
    expect(
      entries[0]!
        .querySelector(
          '.changelog-entry-meta > .changelog-entry-meta-inner > a.changelog-entry-date',
        )!
        .getAttribute('href'),
    ).toBe('#1.1.0');
    expect(entries[0]!.querySelector('time')!.getAttribute('datetime')).toBe(
      '2026-02-03',
    );
    expect(entries[0]!.querySelector('time')!.textContent).toBe('Feb 3, 2026');
    expect(
      entries[0]!
        .querySelector(
          '.changelog-entry-content > h2.changelog-entry-title > a',
        )!
        .getAttribute('href'),
    ).toBe('#1.1.0');
    expect(entries[0]!.querySelector('h2')!.textContent).toBe('1.1.0');
    expect(
      entries[0]!.querySelector('.changelog-entry-body.rendered-mdx h3')!
        .textContent,
    ).toBe('Added');
  });

  it('keeps reference links working inside entries', async () => {
    const body = await html(KAC);
    const link = body.querySelector(
      '.changelog-entry-body a[href^="https://example.com/compare"]',
    );
    expect(link).not.toBeNull();
  });

  it('renders a non-empty Unreleased with the state class', async () => {
    const body = await html('## Unreleased\n\n- soon\n\n## 1.0.0\n\n- x\n');
    const first = body.querySelector('li.changelog-entry')!;
    expect(first.classList.contains('is-unreleased')).toBe(true);
    expect(first.id).toBe('unreleased');
    expect(first.querySelector('.changelog-entry-date')).toBeNull();
    expect(first.querySelector('h2')!.textContent).toBe('Unreleased');
  });

  it('uses the option title when there is no # heading, then "Changelog"', async () => {
    expect(
      (await html('## 1.0.0\n\n- x\n', 'CLI releases')).querySelector(
        '.changelog-title',
      )!.textContent,
    ).toBe('CLI releases');
    expect(
      (await html('## 1.0.0\n\n- x\n')).querySelector('.changelog-title')!
        .textContent,
    ).toBe('Changelog');
  });

  it('date-only headings: title from text or formatted date', async () => {
    const body = await html(
      '## 2026-09-18 - Big launch\n\nx\n\n## 2026-09-01\n\ny\n',
    );
    const titles = [...body.querySelectorAll('h2.changelog-entry-title')].map(
      (h) => h.textContent,
    );
    expect(titles).toEqual(['Big launch', 'Sep 1, 2026']);
  });

  it('leaves files without version headings untouched', async () => {
    const body = await html('# Notes\n\nJust prose.\n');
    expect(body.querySelector('.changelog')).toBeNull();
    expect(body.querySelector('h1')!.textContent).toBe('Notes');
  });

  describe('compare links (Q9)', () => {
    it('adds a Compare link for a Keep a Changelog reference heading', async () => {
      const body = await html(KAC);
      const [newest, oldest] = body.querySelectorAll('li.changelog-entry');
      const compare = newest!.querySelector(
        '.changelog-entry-meta-inner > a.changelog-entry-compare',
      );
      expect(compare!.getAttribute('href')).toBe(
        'https://example.com/compare/v1.0.0...v1.1.0',
      );
      expect(compare!.textContent).toBe('Compare');
      // [1.0.0] has no definition, so it's plain text and gets no link
      expect(oldest!.querySelector('.changelog-entry-compare')).toBeNull();
    });

    it('adds a Compare link for a release-please inline-linked heading', async () => {
      const body = await html(
        '## [17.11.2](https://github.com/o/r/compare/v17.11.1...v17.11.2) (2026-08-24)\n\n- fix\n',
      );
      const entry = body.querySelector('li.changelog-entry')!;
      expect(entry.id).toBe('17.11.2');
      expect(entry.querySelector('h2')!.textContent).toBe('17.11.2');
      expect(entry.querySelector('h2 a')!.getAttribute('href')).toBe(
        '#17.11.2',
      );
      const compare = entry.querySelector('a.changelog-entry-compare')!;
      expect(compare.getAttribute('href')).toBe(
        'https://github.com/o/r/compare/v17.11.1...v17.11.2',
      );
      expect(compare.textContent).toBe('Compare');
    });

    it('labels a non-compare heading link "Release"', async () => {
      const body = await html(
        '## [2.0.0](https://github.com/o/r/releases/tag/v2.0.0) - 2026-01-01\n\n- x\n',
      );
      expect(body.querySelector('a.changelog-entry-compare')!.textContent).toBe(
        'Release',
      );
    });

    it('adds no link when the heading has none', async () => {
      const body = await html('## 2.3.0\n\n- x\n');
      expect(body.querySelector('.changelog-entry-compare')).toBeNull();
    });
  });
});

function skeleton(el: Element): string {
  const cls = [...el.classList]
    .filter((c) => c.startsWith('changelog') || c === 'rendered-mdx')
    .sort()
    .join('.');
  const kids = [...el.children].map(skeleton).filter(Boolean).join(',');
  return cls || kids
    ? `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${kids ? `[${kids}]` : ''}`
    : '';
}

describe('parity with the v1 React components', () => {
  it('matches the ChangelogEntry (index variant) DOM skeleton', async () => {
    const fromPlugin = (
      await html('## 1.0.0 - 2026-01-02\n\nBody\n')
    ).querySelector('li.changelog-entry')!;
    const { container } = render(
      <ol>
        <ChangelogEntry
          variant="index"
          authors={[]}
          entry={{
            id: 'x',
            path: 'x.md',
            url: '#1.0.0',
            anchor: '1.0.0',
            title: '1.0.0',
            date: '2026-01-02',
            authors: [],
          }}
        >
          <p>Body</p>
        </ChangelogEntry>
      </ol>,
    );
    const fromReact = container.querySelector('li.changelog-entry')!;
    expect(skeleton(fromPlugin)).toBe(skeleton(fromReact));
  });

  it('matches the ChangelogIndex header and list skeleton', async () => {
    const fromPlugin = (await html('# T\n\nIntro\n\n## 1.0.0\n\nBody\n'))
      .querySelector('.changelog')!
      .cloneNode(true) as Element;
    fromPlugin.querySelector('ol')!.replaceChildren();
    const { container } = render(
      <ChangelogIndex title="T" intro={<p>Intro</p>} pagination={null}>
        {null}
      </ChangelogIndex>,
    );
    expect(skeleton(fromPlugin)).toBe(
      skeleton(container.querySelector('.changelog')!),
    );
  });
});
