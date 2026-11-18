import { describe, expect, it } from 'vitest';
import { pickBlobForSlug } from './converted-blob';

describe('pickBlobForSlug', () => {
  it('returns undefined for no candidates', () => {
    expect(pickBlobForSlug([])).toBeUndefined();
  });

  it('returns the only candidate, even a Word file', () => {
    expect(pickBlobForSlug([{ path: 'report.docx' }])?.path).toBe(
      'report.docx',
    );
  });

  it('a Markdown page beats a Word file with the same slug', () => {
    expect(
      pickBlobForSlug([{ path: 'report.docx' }, { path: 'report.md' }])?.path,
    ).toBe('report.md');
    expect(
      pickBlobForSlug([{ path: 'report.DOCX' }, { path: 'report.mdx' }])?.path,
    ).toBe('report.mdx');
  });

  it('any Markdown page beats a Word index file', () => {
    expect(
      pickBlobForSlug([{ path: 'a/index.docx' }, { path: 'a/README.md' }])
        ?.path,
    ).toBe('a/README.md');
  });

  it('keeps the existing order: index.* over README.* over a same-named file', () => {
    expect(
      pickBlobForSlug([
        { path: 'a/README.md' },
        { path: 'a/index.md' },
        { path: 'a.md' },
      ])?.path,
    ).toBe('a/index.md');
    expect(
      pickBlobForSlug([
        { path: 'changelog.md' },
        { path: 'changelog/README.md' },
      ])?.path,
    ).toBe('changelog/README.md');
    expect(pickBlobForSlug([{ path: 'x.md' }, { path: 'y.md' }])?.path).toBe(
      'x.md',
    );
  });

  it('among Word files only, index.docx wins', () => {
    expect(
      pickBlobForSlug([{ path: 'a/README.docx' }, { path: 'a/index.docx' }])
        ?.path,
    ).toBe('a/index.docx');
    expect(
      pickBlobForSlug([{ path: 'a.docx' }, { path: 'a/README.docx' }])?.path,
    ).toBe('a/README.docx');
  });
});
