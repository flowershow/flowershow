import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import {
  entryAnchor,
  hasVersionSections,
  headingText,
  isVersionHeading,
  parseVersionHeading,
  splitChangelogTree,
} from './changelog-file';

const parse = (md: string) =>
  unified().use(remarkParse).use(remarkGfm).parse(md);

describe('parseVersionHeading', () => {
  it.each([
    ['Unreleased', { unreleased: true }],
    ['[Unreleased]', { unreleased: true }],
    [
      '2.0.0 - 2026-06-07',
      { version: '2.0.0', date: '2026-06-07', unreleased: false },
    ],
    [
      '[1.1.2] - 2024-09-27',
      { version: '1.1.2', date: '2024-09-27', unreleased: false },
    ],
    [
      '1.0.0 – 2020-01-02',
      { version: '1.0.0', date: '2020-01-02', unreleased: false },
    ],
    [
      '17.11.2 (2026-08-24)',
      { version: '17.11.2', date: '2026-08-24', unreleased: false },
    ],
    ['2026-09-18', { date: '2026-09-18', unreleased: false }],
    [
      '2026-09-18 - Big launch',
      { date: '2026-09-18', title: 'Big launch', unreleased: false },
    ],
    [
      '2026-09-18: Big launch',
      { date: '2026-09-18', title: 'Big launch', unreleased: false },
    ],
    ['2.3.0', { version: '2.3.0', unreleased: false }],
    ['v1.0.0-beta.1', { version: 'v1.0.0-beta.1', unreleased: false }],
    [
      '@changesets/cli@3.0.3',
      { version: '@changesets/cli@3.0.3', unreleased: false },
    ],
    ['Spring cleanup', { title: 'Spring cleanup', unreleased: false }],
  ])('%s', (text, expected) => {
    expect(parseVersionHeading(text)).toEqual(expected);
  });
});

describe('headingText', () => {
  it('flattens links and strips inline html', () => {
    const tree = parse(
      '## [17.11.2](https://x/compare) (2026-08-24)\n\n# <small>3.0.0 (2018-11-01)</small>\n',
    );
    expect(headingText(tree.children[0] as any)).toBe('17.11.2 (2026-08-24)');
    expect(headingText(tree.children[1] as any)).toBe('3.0.0 (2018-11-01)');
  });
});

describe('isVersionHeading', () => {
  it('treats every ## as a version', () => {
    expect(isVersionHeading(2, parseVersionHeading('Spring cleanup'))).toBe(
      true,
    );
  });
  it('treats # as a version only when it parses as one', () => {
    expect(isVersionHeading(1, parseVersionHeading('3.1.0 (2019-04-10)'))).toBe(
      true,
    );
    expect(isVersionHeading(1, parseVersionHeading('Changelog'))).toBe(false);
    expect(isVersionHeading(1, parseVersionHeading('@changesets/cli'))).toBe(
      false,
    );
  });
  it('never treats ### as a version', () => {
    expect(isVersionHeading(3, parseVersionHeading('1.0.0'))).toBe(false);
  });
});

describe('splitChangelogTree', () => {
  it('Keep a Changelog: title, preamble, Unreleased, versions, bottom refs stay in last section', () => {
    const tree = parse(
      '# Changelog\n\nAll notable changes.\n\n## [Unreleased]\n\n### Fixed\n\n- a\n\n## [1.0.0] - 2026-01-02\n\n### Added\n\n- b\n\n[1.0.0]: https://x/compare\n',
    );
    const { titleNode, preamble, sections } = splitChangelogTree(tree);
    expect(headingText(titleNode!)).toBe('Changelog');
    expect(preamble).toHaveLength(1);
    expect(sections.map((s) => s.parsed)).toEqual([
      { unreleased: true },
      { version: '1.0.0', date: '2026-01-02', unreleased: false },
    ]);
    expect(sections[1]!.nodes.some((n) => n.type === 'definition')).toBe(true);
  });
  it('Changesets: package title and version-only headings', () => {
    const { titleNode, sections } = splitChangelogTree(
      parse(
        '# @changesets/cli\n\n## 3.0.3\n\n### Patch Changes\n\n- x\n\n## 3.0.2\n\n- y\n',
      ),
    );
    expect(headingText(titleNode!)).toBe('@changesets/cli');
    expect(sections.map((s) => s.parsed.version)).toEqual(['3.0.3', '3.0.2']);
  });
  it('old conventional: # versions mixed with ## versions', () => {
    const { titleNode, sections } = splitChangelogTree(
      parse(
        '# Changelog\n\n## [3.1.1](u) (2019-05-01)\n\n- a\n\n# [3.1.0](u) (2019-04-10)\n\n- b\n',
      ),
    );
    expect(headingText(titleNode!)).toBe('Changelog');
    expect(sections.map((s) => s.parsed.version)).toEqual(['3.1.1', '3.1.0']);
  });
  it('no version headings → no sections', () => {
    expect(
      splitChangelogTree(parse('# Notes\n\nJust prose.\n')).sections,
    ).toEqual([]);
  });
});

describe('entryAnchor', () => {
  it('uses version, unreleased, date, or title slug and dedupes', () => {
    const used = new Set<string>();
    expect(entryAnchor({ version: '2.0.0', unreleased: false }, used)).toBe(
      '2.0.0',
    );
    expect(entryAnchor({ version: '2.0.0', unreleased: false }, used)).toBe(
      '2.0.0-1',
    );
    expect(entryAnchor({ unreleased: true }, used)).toBe('unreleased');
    expect(entryAnchor({ date: '2026-09-18', unreleased: false }, used)).toBe(
      '2026-09-18',
    );
    expect(
      entryAnchor({ title: 'Spring Clean-up!', unreleased: false }, used),
    ).toBe('spring-clean-up');
    expect(
      entryAnchor({ version: '@scope/pkg@1.2.0', unreleased: false }, used),
    ).toBe('scope-pkg-1.2.0');
  });
});

describe('hasVersionSections', () => {
  it('is true for a changelog with version headings', () => {
    expect(hasVersionSections('# Changelog\n\n## 1.0.0\n\n- x\n')).toBe(true);
  });
  it('is false for prose-only files', () => {
    expect(hasVersionSections('# Notes\n\nJust prose.\n')).toBe(false);
  });
  it('ignores frontmatter (not a setext heading)', () => {
    expect(
      hasVersionSections(
        '---\nlayout: changelog\ntitle: X\n---\n\nJust prose.\n',
      ),
    ).toBe(false);
  });
});
