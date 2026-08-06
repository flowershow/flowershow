/**
 * Integration tests for the markdown-rendering pipeline's plugin *seams* —
 */
import { remarkWikiLink } from '@flowershow/remark-wiki-link';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import rehypeJsonCanvas from './rehype-json-canvas';
import remarkCommonMarkLink from './remark-commonmark-link';
import { resolveContentLink } from './resolve-link';

const SITE_HOSTNAME = 'test.flowershow.site';

const SIMPLE_CANVAS_JSON = JSON.stringify({
  nodes: [
    {
      id: 'n1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      text: 'Test Node',
    },
  ],
  edges: [],
});

// Mirror the app's real urlResolver (lib/markdown.ts `getUrlResolver`), which
// deliberately ignores the `isEmbed` flag and always runs resolveContentLink —
// this is what strips `.canvas` from the embed src in production.
const urlResolver = ({
  filePath,
  heading,
}: {
  filePath: string;
  heading?: string;
  isEmbed?: boolean;
}) =>
  resolveContentLink({
    target: `${filePath}${heading ? `#${heading}` : ''}`,
    siteHostname: SITE_HOSTNAME,
  });

async function render({
  md,
  files = [],
  canvasFiles = {},
  rehypeRawPass,
}: {
  md: string;
  files?: string[];
  canvasFiles?: Record<string, string>;
  rehypeRawPass: boolean;
}): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    // Order mirrors lib/markdown.ts: commonmark link resolution first, then
    // wiki-link resolution.
    .use(remarkCommonMarkLink, {
      filePath: '/index.md',
      siteHostname: SITE_HOSTNAME,
    })
    .use(remarkWikiLink, { files, format: 'shortestPossible', urlResolver })
    .use(remarkRehype, { allowDangerousHtml: true });

  // The pure-markdown pipeline runs rehype-raw before rehype-json-canvas, which
  // re-parses the tree and camelCases hast property keys
  // (data-fs-resolved-file-path -> dataFsResolvedFilePath). The MDX pipeline has
  // no rehype-raw, so the key stays dashed. The plugin must handle both.
  if (rehypeRawPass) processor.use(rehypeRaw);

  processor
    .use(rehypeJsonCanvas, { canvasFiles, siteHostname: SITE_HOSTNAME })
    .use(rehypeStringify);

  return String(await processor.process(md));
}

const PIPELINES = [
  { name: 'pure-markdown pipeline (with rehype-raw)', rehypeRawPass: true },
  { name: 'MDX pipeline (no rehype-raw)', rehypeRawPass: false },
];

for (const pipeline of PIPELINES) {
  describe(`canvas embed renders through the ${pipeline.name}`, () => {
    it('renders a standard-markdown ![](x.canvas) embed', async () => {
      const html = await render({
        md: '![](diagram.canvas)',
        canvasFiles: { 'diagram.canvas': SIMPLE_CANVAS_JSON },
        rehypeRawPass: pipeline.rehypeRawPass,
      });

      // Prove the resolver actually stripped the extension — otherwise this
      // test would pass for the wrong reason (the exact trap the old unit test
      // fell into).
      expect(html).not.toContain('diagram.canvas');
      expect(html).toContain('<div class="canvas-embed">');
      expect(html).toContain('Test Node');
      expect(html).not.toContain('<img');
    });

    it('renders a wiki-link ![[x.canvas]] embed', async () => {
      const html = await render({
        md: '![[diagram.canvas]]',
        files: ['diagram.canvas'],
        canvasFiles: { 'diagram.canvas': SIMPLE_CANVAS_JSON },
        rehypeRawPass: pipeline.rehypeRawPass,
      });

      expect(html).not.toContain('diagram.canvas');
      expect(html).toContain('<div class="canvas-embed">');
      expect(html).toContain('Test Node');
      expect(html).not.toContain('<img');
    });
  });
}
