import markdown from 'remark-parse';
import { unified } from 'unified';
import { select } from 'unist-util-select';
import { visit } from 'unist-util-visit';

import wikiLinkPlugin from '../src/lib/remarkWikiLink';

describe('remark-wiki-link', () => {
  describe('Parses a wikilink', () => {
    test('that has a matching file', () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          files: ['Wiki Link.md'],
        });

      let ast = processor.parse('[[Wiki Link]]');

      expect(select('wikiLink', ast)).not.toEqual(null);

      visit(ast, 'wikiLink', (node: any) => {
        expect(node.value).toBe('Wiki Link');
        expect(node.data.path).toBe('Wiki Link');
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(true);
        expect(node.data.hName).toBe('a');
        expect(node.data.hProperties?.className).toBe('internal');
        expect(node.data.hProperties?.href).toBe('Wiki Link');
        expect(node.data.hChildren?.[0].value).toBe('Wiki Link');
      });
    });

    test("that doesn't have a matching file", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse('[[New Page]]');

      expect(select('wikiLink', ast)).not.toEqual(null);

      visit(ast, 'wikiLink', (node: any) => {
        expect(node.value).toBe('New Page');
        expect(node.data.path).toBe('New Page');
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe('a');
        expect(node.data.hProperties?.className).toBe('internal new');
        expect(node.data.hProperties?.href).toBe('New Page');
        expect(node.data.hChildren?.[0].value).toBe('New Page');
      });
    });

    test('with a heading', () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse('[[Wiki Link#Some Heading]]');

      expect(select('wikiLink', ast)).not.toEqual(null);

      visit(ast, 'wikiLink', (node: any) => {
        expect(node.value).toBe('Wiki Link#Some Heading');
        expect(node.data.path).toBe('Wiki Link#some-heading');
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe('a');
        expect(node.data.hProperties?.className).toBe('internal new');
        expect(node.data.hProperties?.href).toBe('Wiki Link#some-heading');
        expect(node.data.hChildren?.[0].value).toBe('Wiki Link#Some Heading');
      });
    });

    test('resolves to shortest path when multiple files match in shortestPossible mode', () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          files: ['/blog/test.md', '/test.md', '/docs/guide/test.md'],
          format: 'shortestPossible',
        });

      let ast = processor.parse('[[test]]');

      expect(select('wikiLink', ast)).not.toEqual(null);

      visit(ast, 'wikiLink', (node: any) => {
        expect(node.value).toBe('test');
        expect(node.data.path).toBe('/test');
        expect(node.data.existing).toBe(true);
        expect(node.data.hProperties?.href).toBe('/test');
      });
    });

    test('matches files case-insensitively by default', () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          files: ['Wiki Link.md'],
        });

      let ast = processor.parse('[[wiki link]]');

      expect(select('wikiLink', ast)).not.toEqual(null);

      visit(ast, 'wikiLink', (node: any) => {
        expect(node.value).toBe('wiki link');
        expect(node.data.existing).toBe(true);
        expect(node.data.hProperties?.className).toBe('internal');
      });
    });

    test('matches files case-insensitively when explicitly enabled', () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          files: ['/Blog/Post.md', '/About.mdx'],
          caseInsensitive: true,
        });

      let ast = processor.parse('[[blog/post]]');

      expect(select('wikiLink', ast)).not.toEqual(null);

      visit(ast, 'wikiLink', (node: any) => {
        expect(node.value).toBe('blog/post');
        expect(node.data.existing).toBe(true);
        expect(node.data.path).toBe('/Blog/Post');
      });
    });

    test('does not match files with different case when case-sensitive', () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          files: ['Wiki Link.md'],
          caseInsensitive: false,
        });

      let ast = processor.parse('[[wiki link]]');

      expect(select('wikiLink', ast)).not.toEqual(null);

      visit(ast, 'wikiLink', (node: any) => {
        expect(node.value).toBe('wiki link');
        expect(node.data.existing).toBe(false);
        expect(node.data.hProperties?.className).toBe('internal new');
      });
    });

    describe('Parses an embed', () => {
      test('image', () => {
        const processor = unified().use(markdown).use(wikiLinkPlugin);

        let ast = processor.parse('![[My Image.jpg]]');

        expect(select('embed', ast)).not.toEqual(null);

        visit(ast, 'embed', (node: any) => {
          expect(node.value).toEqual('My Image.jpg');
          expect(node.data?.path).toEqual('My Image.jpg');
          expect(node.data?.alias).toEqual(undefined);
          expect(node.data?.existing).toEqual(false);
          expect(node.data.hProperties?.className).toBe('internal new');
          expect(node.data.hProperties?.src).toBe('My Image.jpg');
          expect(node.data.hProperties?.alt).toBe('My Image');
        });
      });

      test('custom urlResolver', () => {
        const urlResolver = ({
          filePath,
          isEmbed,
        }: {
          filePath: string;
          isEmbed: boolean;
        }) => {
          if (!isEmbed) {
            return filePath.replace(/\s+/g, '-').toLowerCase();
          }
          return filePath;
        };

        const processor = unified()
          .use(markdown)
          .use(wikiLinkPlugin, {
            files: ['/assets/My Image.jpg'],
            urlResolver,
          });

        let ast = processor.parse('![[My Image.jpg]]');

        expect(select('embed', ast)).not.toEqual(null);

        visit(ast, 'embed', (node: any) => {
          expect(node.value).toEqual('My Image.jpg');
          expect(node.data?.path).toEqual('/assets/My Image.jpg');
          expect(node.data?.alias).toEqual(undefined);
          expect(node.data?.existing).toEqual(true);
          expect(node.data.hProperties?.className).toBe('internal');
          expect(node.data.hProperties?.src).toBe('/assets/My Image.jpg');
          expect(node.data.hProperties?.alt).toBe('My Image');
        });
      });

      test('video', () => {
        const processor = unified().use(markdown).use(wikiLinkPlugin);

        let ast = processor.parse('![[My Video.mp4]]');

        expect(select('embed', ast)).not.toEqual(null);

        visit(ast, 'embed', (node: any) => {
          expect(node.value).toEqual('My Video.mp4');
          expect(node.data?.path).toEqual('My Video.mp4');
          expect(node.data?.alias).toEqual(undefined);
          expect(node.data?.existing).toEqual(false);
          expect(node.data.hName).toBe('video');
          expect(node.data.hProperties?.className).toBe('internal new');
          expect(node.data.hProperties?.src).toBe('My Video.mp4');
          expect(node.data.hProperties?.controls).toBe(true);
        });
      });

      test('video with dimensions', () => {
        const processor = unified().use(markdown).use(wikiLinkPlugin);

        let ast = processor.parse('![[My Video.mp4|640x480]]');

        expect(select('embed', ast)).not.toEqual(null);

        visit(ast, 'embed', (node: any) => {
          expect(node.value).toEqual('My Video.mp4');
          expect(node.data?.path).toEqual('My Video.mp4');
          // Alias is cleared when dimensions are parsed
          expect(node.data?.alias).toEqual(undefined);
          expect(node.data?.existing).toEqual(false);
          expect(node.data.hName).toBe('video');
          expect(node.data.hProperties?.className).toBe('internal new');
          expect(node.data.hProperties?.src).toBe('My Video.mp4');
          expect(node.data.hProperties?.controls).toBe(true);
          expect(node.data.hProperties?.['data-fs-width']).toBe('640');
          expect(node.data.hProperties?.['data-fs-height']).toBe('480');
        });
      });

      test('audio', () => {
        const processor = unified().use(markdown).use(wikiLinkPlugin);

        let ast = processor.parse('![[My Audio.mp3]]');

        expect(select('embed', ast)).not.toEqual(null);

        visit(ast, 'embed', (node: any) => {
          expect(node.value).toEqual('My Audio.mp3');
          expect(node.data?.path).toEqual('My Audio.mp3');
          expect(node.data?.alias).toEqual(undefined);
          expect(node.data?.existing).toEqual(false);
          expect(node.data.hName).toBe('audio');
          expect(node.data.hProperties?.className).toBe('internal new');
          expect(node.data.hProperties?.src).toBe('My Audio.mp3');
          expect(node.data.hProperties?.controls).toBe(true);
        });
      });

      test('pdf', () => {
        const processor = unified().use(markdown).use(wikiLinkPlugin);

        let ast = processor.parse('![[My Document.pdf]]');

        expect(select('embed', ast)).not.toEqual(null);

        visit(ast, 'embed', (node: any) => {
          expect(node.value).toEqual('My Document.pdf');
          expect(node.data?.path).toEqual('My Document.pdf');
          expect(node.data?.alias).toEqual(undefined);
          expect(node.data?.existing).toEqual(false);
          expect(node.data.hName).toBe('iframe');
          expect(node.data.hProperties?.className).toBe('internal new');
          expect(node.data.hProperties?.src).toBe('My Document.pdf');
          expect(node.data.hProperties?.title).toBe('My Document');
        });
      });
    });

    describe('Permalinks', () => {
      test('uses permalink when file matches and permalink is provided', () => {
        const processor = unified()
          .use(markdown)
          .use(wikiLinkPlugin, {
            files: ['blog/my-post.md'],
            permalinks: {
              'blog/my-post.md': '/custom-url',
            },
          });

        let ast = processor.parse('[[blog/my-post]]');

        expect(select('wikiLink', ast)).not.toEqual(null);

        visit(ast, 'wikiLink', (node: any) => {
          expect(node.value).toBe('blog/my-post');
          expect(node.data.path).toBe('/custom-url');
          expect(node.data.existing).toBe(true);
          expect(node.data.hProperties?.href).toBe('/custom-url');
          expect(node.data.hProperties?.className).toBe('internal');
        });
      });

      test('uses permalink with heading when provided', () => {
        const processor = unified()
          .use(markdown)
          .use(wikiLinkPlugin, {
            files: ['blog/my-post.md'],
            permalinks: {
              'blog/my-post.md': '/custom-url',
            },
          });

        let ast = processor.parse('[[blog/my-post#Section]]');

        expect(select('wikiLink', ast)).not.toEqual(null);

        visit(ast, 'wikiLink', (node: any) => {
          expect(node.value).toBe('blog/my-post#Section');
          expect(node.data.path).toBe('/custom-url#Section');
          expect(node.data.existing).toBe(true);
          expect(node.data.hProperties?.href).toBe('/custom-url#Section');
        });
      });

      test('falls back to urlResolver when no permalink is provided', () => {
        const processor = unified()
          .use(markdown)
          .use(wikiLinkPlugin, {
            files: ['blog/my-post.md'],
            permalinks: {
              'other/file.md': '/other-url',
            },
          });

        let ast = processor.parse('[[blog/my-post]]');

        expect(select('wikiLink', ast)).not.toEqual(null);

        visit(ast, 'wikiLink', (node: any) => {
          expect(node.value).toBe('blog/my-post');
          expect(node.data.path).toBe('blog/my-post');
          expect(node.data.existing).toBe(true);
          expect(node.data.hProperties?.href).toBe('blog/my-post');
        });
      });

      test('works with shortestPossible format', () => {
        const processor = unified()
          .use(markdown)
          .use(wikiLinkPlugin, {
            files: ['blog/test.md', 'test.md'],
            permalinks: {
              'blog/test.md': '/blog-permalink',
              'test.md': '/test-permalink',
            },
            format: 'shortestPossible',
          });

        let ast = processor.parse('[[test]]');

        expect(select('wikiLink', ast)).not.toEqual(null);

        visit(ast, 'wikiLink', (node: any) => {
          expect(node.value).toBe('test');
          // Should match blog/test.md (shortest path)
          expect(node.data.path).toBe('/test-permalink');
          expect(node.data.existing).toBe(true);
          expect(node.data.hProperties?.href).toBe('/test-permalink');
        });
      });

      test('permalink is applied to embeds', () => {
        const processor = unified()
          .use(markdown)
          .use(wikiLinkPlugin, {
            files: ['assets/image.jpg'],
            permalinks: {
              'assets/image.jpg': '/custom-image-url',
            },
          });

        let ast = processor.parse('![[image.jpg]]');

        expect(select('embed', ast)).not.toEqual(null);

        visit(ast, 'embed', (node: any) => {
          expect(node.value).toBe('image.jpg');
          // Embeds should use the permalink when available
          expect(node.data.path).toBe('/custom-image-url');
          expect(node.data.hProperties?.src).toBe('/custom-image-url');
        });
      });
    });
  });
});
