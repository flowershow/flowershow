import { describe, expect, test } from 'vitest';
import {
  CONVERTIBLE_EXTENSIONS,
  derivedAssetKey,
  derivedAssetUrlPath,
  derivedMarkdownKey,
  derivedPrefix,
  isConvertiblePath,
  isMarkdownLikePage,
  MARKDOWN_LIKE_EXTENSIONS,
  pageSlugFromPath,
  parseDerivedUrlPath,
} from './convertible';
import { filePathToSlug } from './file-path-to-slug';

describe('convertible helpers', () => {
  test('constants', () => {
    expect(CONVERTIBLE_EXTENSIONS.has('docx')).toBe(true);
    expect(MARKDOWN_LIKE_EXTENSIONS).toEqual(['md', 'mdx', 'docx']);
  });

  test('isConvertiblePath', () => {
    expect(isConvertiblePath('a/Report.DOCX')).toBe(true);
    expect(isConvertiblePath('a/report.md')).toBe(false);
    expect(isConvertiblePath('docx')).toBe(false);
  });

  test('isMarkdownLikePage', () => {
    expect(isMarkdownLikePage('x.docx')).toBe(true);
    expect(isMarkdownLikePage('x.MD')).toBe(true);
    expect(isMarkdownLikePage('x.mdx')).toBe(true);
    expect(isMarkdownLikePage('x.canvas')).toBe(false);
  });

  test('derived keys', () => {
    expect(derivedPrefix('a/r.docx')).toBe('derived/a/r.docx/');
    expect(derivedMarkdownKey('s1', 'My Notes/r.docx', 'abc')).toBe(
      's1/main/derived/My Notes/r.docx/abc/index.md',
    );
    expect(derivedAssetKey('s1', 'r.docx', 'abc', 'image1.png')).toBe(
      's1/main/derived/r.docx/abc/image1.png',
    );
  });

  test('derivedAssetUrlPath', () => {
    expect(
      derivedAssetUrlPath('My Notes/r (1).docx', 'abc', 'image1.png'),
    ).toBe('/_derived/My%20Notes/r%20(1).docx/abc/image1.png');
  });

  test('parseDerivedUrlPath', () => {
    expect(parseDerivedUrlPath('_derived/My Notes/r.docx/abc/image1.png')).toBe(
      'derived/My Notes/r.docx/abc/image1.png',
    );
    expect(parseDerivedUrlPath('/_derived/a/b.docx/abc/i.png')).toBe(
      'derived/a/b.docx/abc/i.png',
    );
    expect(parseDerivedUrlPath('_derived/../x/abc/i.png')).toBeNull();
    expect(parseDerivedUrlPath('_derived/a//i.png')).toBeNull();
    expect(parseDerivedUrlPath('other/a/i.png')).toBeNull();
    expect(parseDerivedUrlPath('_derived/')).toBeNull();
  });

  test('pageSlugFromPath', () => {
    expect(pageSlugFromPath('docs/Q3 Report.docx')).toBe('/docs/Q3+Report');
    expect(pageSlugFromPath('index.docx')).toBe('/');
    expect(pageSlugFromPath('docs/README.docx')).toBe('/docs');
    expect(pageSlugFromPath('docs/a.md')).toBe('/docs/a');
    expect(pageSlugFromPath('a.pdf')).toBeNull();
  });

  test('filePathToSlug is unchanged for docx', () => {
    expect(filePathToSlug('report.docx')).toBe('/report.docx');
  });
});
