import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import rehypeHtmlEnhancements from './rehype-html-enhancements';

async function processWithRawHtml(html: string) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHtmlEnhancements)
    .use(rehypeStringify)
    .process(html);

  return String(result);
}

describe('rehypeHtmlEnhancements (markdown pipeline)', () => {
  it('adds target and rel for external links without explicit target', async () => {
    const html = await processWithRawHtml(
      '<a href="https://example.com">External</a>',
    );

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('respects author-defined target for external links', async () => {
    const html = await processWithRawHtml(
      '<a href="https://example.com" target="_self">External</a>',
    );

    expect(html).toContain('target="_self"');
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain('rel="noopener noreferrer"');
  });
});

describe('rehypeHtmlEnhancements (MDX JSX nodes)', () => {
  function makeAnchorNode(href: string, target?: string) {
    const attrs: any[] = [
      { type: 'mdxJsxAttribute', name: 'href', value: href },
    ];
    if (target)
      attrs.push({ type: 'mdxJsxAttribute', name: 'target', value: target });
    return {
      type: 'root',
      children: [
        {
          type: 'mdxJsxTextElement',
          name: 'a',
          attributes: attrs,
          children: [{ type: 'text', value: 'link' }],
        },
      ],
    };
  }

  function applyPlugin(tree: any) {
    const plugin = rehypeHtmlEnhancements();
    plugin(tree);
    return tree;
  }

  it('adds target and rel to MDX JSX anchor without explicit target', () => {
    const tree = applyPlugin(makeAnchorNode('https://example.com'));
    const attrs: any[] = tree.children[0].attributes;
    expect(attrs.find((a: any) => a.name === 'target')?.value).toBe('_blank');
    expect(attrs.find((a: any) => a.name === 'rel')?.value).toBe(
      'noopener noreferrer',
    );
  });

  it('preserves author-defined target on MDX JSX anchor', () => {
    const tree = applyPlugin(makeAnchorNode('https://example.com', '_self'));
    const attrs: any[] = tree.children[0].attributes;
    expect(attrs.find((a: any) => a.name === 'target')?.value).toBe('_self');
    expect(attrs.filter((a: any) => a.name === 'target')).toHaveLength(1);
  });

  it('does not touch non-external MDX JSX anchors', () => {
    const tree = applyPlugin(makeAnchorNode('/internal/path'));
    const attrs: any[] = tree.children[0].attributes;
    expect(attrs.find((a: any) => a.name === 'target')).toBeUndefined();
  });
});
