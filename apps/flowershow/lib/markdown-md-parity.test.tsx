/**
 * Features that `.mdx` pages get from the MDX components must also work in
 * `.md` pages: copy button on code blocks, ```mermaid diagrams, the PDF viewer
 * for PDF iframes (incl. `![[doc.pdf]]`) and ```base (Obsidian Bases) views.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { processMarkdown } from './markdown';

// Client-only components (ssr: false) render nothing on the server; stub them
// so the tests can see which props they received.
vi.mock('@/components/public/mdx/mdx-client-components', () => ({
  Mermaid: ({ chart }: { chart: string }) => (
    <div data-testid="mermaid">{chart}</div>
  ),
  ObsidianBasesViews: (props: Record<string, string>) => (
    <div data-testid="bases">{JSON.stringify(props)}</div>
  ),
  PdfViewer: ({ src }: { src: string }) => (
    <div data-testid="pdf-viewer">{src}</div>
  ),
}));
// The real plugin queries the database; this stand-in emits the same node
// shape (an `ObsidianBasesViews` MDX JSX element with string attributes).
vi.mock('./remark-obsidian-bases', () => ({
  default: () => (tree: any) => {
    tree.children = tree.children.map((node: any) =>
      node.type === 'code' && node.lang === 'base'
        ? {
            type: 'mdxJsxFlowElement',
            name: 'ObsidianBasesViews',
            attributes: [
              { type: 'mdxJsxAttribute', name: 'viewData', value: '[{"a":1}]' },
              { type: 'mdxJsxAttribute', name: 'siteHostname', value: 'h' },
              { type: 'mdxJsxAttribute', name: 'allSitePaths', value: '[]' },
            ],
            children: [],
          }
        : node,
    );
  },
}));

async function renderMd(source: string) {
  return renderToStaticMarkup(
    await processMarkdown(source, {
      filePath: 'note.md',
      files: ['/doc.pdf'],
      siteHostname: 'test.flowershow.site',
      siteId: 'site-1',
    }),
  );
}

describe('.md parity with .mdx', () => {
  it('adds a copy button to fenced code blocks', async () => {
    const html = await renderMd('```js\nconst a = 1;\n```');

    expect(html).toContain('pre-copy-button');
    expect(html).toMatch(/<pre[^>]*>[\s\S]*const/);
  });

  it('renders ```mermaid blocks as a Mermaid diagram', async () => {
    const html = await renderMd('```mermaid\ngraph TD\n  A --> B\n```');

    expect(html).toContain('data-testid="mermaid"');
    expect(html).toContain('graph TD\n  A --&gt; B');
    expect(html).not.toContain('language-mermaid');
  });

  it('renders an HTML <iframe> of a PDF with the PDF viewer', async () => {
    const html = await renderMd('<iframe src="https://x.org/a.pdf"></iframe>');

    expect(html).toContain('<div data-testid="pdf-viewer">https://x.org/a.pdf');
    expect(html).not.toContain('<iframe');
  });

  it('renders a ![[doc.pdf]] embed with the PDF viewer', async () => {
    const html = await renderMd('![[doc.pdf]]');

    expect(html).toMatch(/data-testid="pdf-viewer">[^<]*doc\.pdf/);
  });

  it('keeps non-PDF iframes as iframes', async () => {
    const html = await renderMd('<iframe src="https://x.org/page"></iframe>');

    expect(html).toContain('<iframe src="https://x.org/page"');
  });

  it('renders ```base blocks as Obsidian Bases views', async () => {
    const html = await renderMd('```base\nviews: []\n```');

    expect(html).toContain('data-testid="bases"');
    expect(html).toContain(
      '&quot;viewData&quot;:&quot;[{\\&quot;a\\&quot;:1}]&quot;',
    );
    expect(html).toContain('&quot;siteHostname&quot;:&quot;h&quot;');
    expect(html).toContain('&quot;allSitePaths&quot;:&quot;[]&quot;');
  });
});
