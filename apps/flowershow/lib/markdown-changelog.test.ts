/**
 * Single-file changelogs through the real page pipelines: the MD renderer
 * (`processMarkdown`, rendered to static HTML) and the MDX renderer
 * (`getMdxOptions` + `serialize`, checked on the compiled source).
 */
import { serialize } from 'next-mdx-remote-client/serialize';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getMdxOptions, processMarkdown } from './markdown';

const KAC = `# Changelog

All notable changes.

## [Unreleased]

- Soon.

## [1.1.0] - 2026-02-03

### Added

- New thing.

## [1.0.0] - 2026-01-02

### Added

- First.

[1.1.0]: https://example.com/compare/v1.0.0...v1.1.0
`;

const base = {
  filePath: 'CHANGELOG.md',
  files: [],
  siteHostname: 'test.flowershow.site',
};

async function renderMd(md: string, changelog?: { title?: string }) {
  const html = renderToStaticMarkup(
    await processMarkdown(md, { ...base, changelog }),
  );
  return new DOMParser().parseFromString(html, 'text/html').body;
}

describe('processMarkdown with the changelog option', () => {
  it('renders the changelog DOM', async () => {
    const body = await renderMd(KAC, {});
    expect(body.querySelector('.changelog-title')!.textContent).toBe(
      'Changelog',
    );
    const entries = body.querySelectorAll('li.changelog-entry');
    expect([...entries].map((e) => e.id)).toEqual([
      'unreleased',
      '1.1.0',
      '1.0.0',
    ]);
    expect(entries[0]!.classList.contains('is-unreleased')).toBe(true);
    expect(
      entries[1]!
        .querySelector('a.changelog-entry-compare')!
        .getAttribute('href'),
    ).toBe('https://example.com/compare/v1.0.0...v1.1.0');
  });

  it('keeps heading links off the generated titles but on body headings', async () => {
    const body = await renderMd(KAC, {});
    expect(body.querySelector('.changelog-title .heading-link')).toBeNull();
    expect(
      body.querySelector('.changelog-entry-title .heading-link'),
    ).toBeNull();
    expect(
      body.querySelector('.changelog-entry-body h3 .heading-link'),
    ).not.toBeNull();
  });

  it('never duplicates an entry anchor as a heading id', async () => {
    const body = await renderMd(KAC, {});
    const ids = [...body.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('leaves normal pages alone without the option', async () => {
    const body = await renderMd(KAC);
    expect(body.querySelector('.changelog')).toBeNull();
  });
});

describe('getMdxOptions with the changelog option', () => {
  it('compiles the changelog DOM in the MDX path', async () => {
    const result = await serialize({
      source: KAC,
      options: getMdxOptions({ ...base, changelog: {} }) as any,
    });
    expect('error' in result).toBe(false);
    const code = (result as { compiledSource: string }).compiledSource;
    expect(code).toContain('changelog-entries');
    expect(code).toContain('changelog-entry-title');
    expect(code).toContain('"1.1.0"');
    expect(code).toContain('is-unreleased');
  });

  it('does not add the changelog DOM without the option', async () => {
    const result = await serialize({
      source: KAC,
      options: getMdxOptions(base) as any,
    });
    const code = (result as { compiledSource: string }).compiledSource;
    expect(code).not.toContain('changelog-entries');
  });
});
