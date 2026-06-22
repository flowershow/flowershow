import { describe, expect, it } from 'vitest';
import { encodeSlug, filePathToSlug } from './file-path-to-slug';

describe('filePathToSlug', () => {
  describe('root files', () => {
    it('root README.md', () => {
      expect(filePathToSlug('/README.md')).toBe('/');
    });

    it('root index.md', () => {
      expect(filePathToSlug('/index.md')).toBe('/');
    });

    it('root index.mdx', () => {
      expect(filePathToSlug('/index.mdx')).toBe('/');
    });

    it('relative root README.md (no leading slash)', () => {
      expect(filePathToSlug('README.md')).toBe('/');
    });
  });

  describe('nested README / index normalisation', () => {
    it('dir README.md', () => {
      expect(filePathToSlug('/blog/README.md')).toBe('/blog');
    });

    it('dir index.md', () => {
      expect(filePathToSlug('/blog/index.md')).toBe('/blog');
    });

    it('nested dir README.md', () => {
      expect(filePathToSlug('/docs/guide/README.md')).toBe('/docs/guide');
    });

    it('nested dir index.md', () => {
      expect(filePathToSlug('/docs/guide/index.md')).toBe('/docs/guide');
    });
  });

  describe('extension stripping', () => {
    it('strips .md', () => {
      expect(filePathToSlug('/blog/post-1.md')).toBe('/blog/post-1');
    });

    it('strips .mdx', () => {
      expect(filePathToSlug('/blog/post-1.mdx')).toBe('/blog/post-1');
    });

    it('strips .canvas', () => {
      expect(filePathToSlug('/My Canvas.canvas')).toBe('/My Canvas');
    });

    it('keeps non-page extension', () => {
      expect(filePathToSlug('/assets/image.png')).toBe('/assets/image.png');
    });
  });

  describe('paths with spaces (no encoding)', () => {
    it('preserves spaces in filename', () => {
      expect(filePathToSlug('/Abc Resources/Xyz Map.md')).toBe(
        '/Abc Resources/Xyz Map',
      );
    });

    it('preserves spaces in directory segment', () => {
      expect(filePathToSlug('/My Notes/Cool Article.md')).toBe(
        '/My Notes/Cool Article',
      );
    });
  });

  describe('relative paths', () => {
    it('normalises relative path with leading slash prepended', () => {
      expect(filePathToSlug('some/file.md')).toBe('/some/file');
    });
  });
});

describe('encodeSlug', () => {
  it('encodes spaces as +', () => {
    expect(encodeSlug('/Abc Resources/Xyz Map')).toBe('/Abc+Resources/Xyz+Map');
  });

  it('encodes spaces in a single segment', () => {
    expect(encodeSlug('/My Canvas')).toBe('/My+Canvas');
  });

  it('leaves root alone', () => {
    expect(encodeSlug('/')).toBe('/');
  });

  it('round-trips with filePathToSlug', () => {
    expect(encodeSlug(filePathToSlug('/My Notes/Cool Article.md'))).toBe(
      '/My+Notes/Cool+Article',
    );
  });
});
