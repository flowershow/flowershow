import { slug } from 'github-slugger';
import { defaultUrlResolver } from '../src/utils/index';

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
