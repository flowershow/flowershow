import { slug } from 'github-slugger';
import { defaultUrlResolver, findMatchingFilePath } from '../src/utils/index';

describe('findMatchingFilePath', () => {
  const files = [
    '/blog/README.md',
    '/blog/about.mdx',
    '/blog/guide/post.mdx',
    '/blog/post.md',
    '/README.mdx',
    '/about.md',
    '/docs/README.md',
  ];

  describe('regular format', () => {
    test('finds exact match', () => {
      expect(
        findMatchingFilePath({
          path: '/about',
          files,
          format: 'regular',
        }),
      ).toBe('/about.md');
    });

    test('finds exact match with .mdx extension', () => {
      expect(
        findMatchingFilePath({
          path: '/blog/about',
          files,
          format: 'regular',
        }),
      ).toBe('/blog/about.mdx');
    });

    test('returns undefined for non-matching path', () => {
      expect(
        findMatchingFilePath({
          path: '/nonexistent',
          files,
          format: 'regular',
        }),
      ).toBeUndefined();
    });

    test('does not match partial paths in regular format', () => {
      expect(
        findMatchingFilePath({
          path: 'post',
          files,
          format: 'regular',
        }),
      ).toBeUndefined();
    });
  });

  describe('shortestPossible format (default)', () => {
    test('finds shortest matching file when multiple matches exist', () => {
      expect(
        findMatchingFilePath({
          path: 'README',
          files,
        }),
      ).toBe('/README.mdx');
    });

    test('matches file ending with path', () => {
      expect(
        findMatchingFilePath({
          path: 'guide/post',
          files,
        }),
      ).toBe('/blog/guide/post.mdx');
    });

    test('returns undefined for non-matching path', () => {
      expect(
        findMatchingFilePath({
          path: 'nonexistent',
          files,
        }),
      ).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('no file path (in heading-only wiki-links)', () => {
      expect(
        findMatchingFilePath({
          path: '',
          files,
        }),
      ).toBeUndefined();
    });

    describe('case-insensitive matching', () => {
      const files = [
        '/Blog/README.md',
        '/Blog/About.mdx',
        '/Blog/Guide/Post.mdx',
        '/BLOG/post.md',
        '/README.mdx',
        '/About.md',
        '/Docs/README.md',
      ];

      test('finds match with different case in regular format', () => {
        expect(
          findMatchingFilePath({
            path: '/about',
            files,
            format: 'regular',
            caseInsensitive: true,
          }),
        ).toBe('/About.md');
      });

      test('finds match with different case in shortestPossible format', () => {
        expect(
          findMatchingFilePath({
            path: 'readme',
            files,
            caseInsensitive: true,
          }),
        ).toBe('/README.mdx');
      });

      test('finds match with mixed case path', () => {
        expect(
          findMatchingFilePath({
            path: 'guide/POST',
            files,
            caseInsensitive: true,
          }),
        ).toBe('/Blog/Guide/Post.mdx');
      });

      test('case-sensitive matching when disabled', () => {
        expect(
          findMatchingFilePath({
            path: 'readme',
            files,
            caseInsensitive: false,
          }),
        ).toBeUndefined();
      });

      test('case-sensitive exact match when disabled', () => {
        expect(
          findMatchingFilePath({
            path: 'README',
            files,
            caseInsensitive: false,
          }),
        ).toBe('/README.mdx');
      });

      test('defaults to case-insensitive when not specified', () => {
        expect(
          findMatchingFilePath({
            path: 'about',
            files,
          }),
        ).toBe('/About.md');
      });
    });
  });
});

describe('defaultUrlResolver', () => {
  describe('basic path resolution', () => {
    test('resolves path with .md extension', () => {
      expect(defaultUrlResolver({ filePath: '/test.md' })).toBe('/test');
    });

    test('resolves path with .mdx extension', () => {
      expect(defaultUrlResolver({ filePath: '/test.mdx' })).toBe('/test');
    });

    test('resolves nested path', () => {
      expect(defaultUrlResolver({ filePath: '/blog/post.md' })).toBe(
        '/blog/post',
      );
    });
  });

  describe('index and README files', () => {
    test('removes trailing /index.md', () => {
      expect(defaultUrlResolver({ filePath: '/blog/index.md' })).toBe('/blog');
    });

    test('removes trailing /README.md', () => {
      expect(defaultUrlResolver({ filePath: '/docs/README.md' })).toBe('/docs');
    });

    test('resolves root index.md to /', () => {
      expect(defaultUrlResolver({ filePath: '/index.md' })).toBe('/');
    });

    test('resolves root README.md to /', () => {
      expect(defaultUrlResolver({ filePath: '/README.md' })).toBe('/');
    });
  });

  describe('headings', () => {
    test('heading only', () => {
      expect(
        defaultUrlResolver({ filePath: '', heading: 'Some heading' }),
      ).toBe(`#${slug('Some heading')}`);
    });

    test('file path and heading', () => {
      expect(
        defaultUrlResolver({
          filePath: '/blog/post.md',
          heading: 'Some heading',
        }),
      ).toBe(`/blog/post#${slug('Some heading')}`);
    });
  });

  describe('edge cases', () => {
    test('preserves index in middle of path', () => {
      expect(defaultUrlResolver({ filePath: '/docs/index/guide.md' })).toBe(
        '/docs/index/guide',
      );
    });

    test('preserves README in middle of path', () => {
      expect(defaultUrlResolver({ filePath: '/docs/README/guide.md' })).toBe(
        '/docs/README/guide',
      );
    });
  });
});
