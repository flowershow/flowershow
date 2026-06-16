import { visit } from 'unist-util-visit';

type MdxAttr = { type: string; name: string; value: any };

/**
 * Rehype plugin to enhance HTML elements with additional attributes and classes.
 *
 * Enhancements:
 * - External links: Adds target="_blank" and rel="noopener noreferrer" to links starting with http(s)://
 * - Code elements: Adds language-auto class to inline code without a language class
 * - Table elements: Wraps tables in a div with overflow-x-auto for horizontal scrolling
 *
 * Handles both `element` nodes (markdown pipeline, rehypeRaw) and
 * `mdxJsxFlowElement`/`mdxJsxTextElement` nodes (MDX pipeline).
 */
const rehypeHtmlEnhancements = (_options?: { sitePrefix?: string }) => {
  return (tree) => {
    // --- Standard rehype element nodes (remark → rehypeRaw pipeline) ---
    visit(tree, 'element', (node: any, index, parent) => {
      if (node.tagName === 'a') {
        const href = (node.properties?.href || '') as string;

        if (/^https?:\/\//i.test(href)) {
          node.properties = node.properties || {};

          if (!node.properties.target) {
            node.properties.target = '_blank';
            node.properties.rel = 'noopener noreferrer';
          }
        }
      }

      if (node.tagName === 'code') {
        node.properties = node.properties || {};
        const className = node.properties.className;

        const classArray = Array.isArray(className) ? className : [];

        const hasLanguageClass = classArray.some(
          (cls) => typeof cls === 'string' && cls.startsWith('language-'),
        );

        if (!hasLanguageClass) {
          node.properties.className = [...classArray, 'language-auto'];
        }
      }

      if (node.tagName === 'table' && parent && typeof index === 'number') {
        const isAlreadyWrapped =
          parent.type === 'element' &&
          parent.tagName === 'div' &&
          Array.isArray(parent.properties?.className) &&
          parent.properties.className.includes('overflow-x-auto');

        if (!isAlreadyWrapped) {
          const wrapper = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['overflow-x-auto'],
            },
            children: [node],
          };

          parent.children[index] = wrapper;
        }
      }
    });

    // --- MDX JSX element nodes (MDX pipeline, no rehypeRaw) ---
    visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node: any) => {
      if (node.name !== 'a') return;

      const attrs: MdxAttr[] = node.attributes || [];
      const href = attrs.find((a) => a.name === 'href')?.value ?? '';

      if (/^https?:\/\//i.test(href)) {
        const hasTarget = attrs.some((a) => a.name === 'target');
        if (!hasTarget) {
          node.attributes = [
            ...attrs,
            { type: 'mdxJsxAttribute', name: 'target', value: '_blank' },
            {
              type: 'mdxJsxAttribute',
              name: 'rel',
              value: 'noopener noreferrer',
            },
          ];
        }
      }
    });
  };
};

export default rehypeHtmlEnhancements;
