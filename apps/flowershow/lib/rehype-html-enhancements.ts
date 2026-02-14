import { visit } from 'unist-util-visit';

interface Options {
  sitePrefix?: string;
}

/**
 * Rehype plugin to enhance HTML elements with additional attributes and classes.
 *
 * Enhancements:
 * - External links: Adds target="_blank" and rel="noopener noreferrer" to links starting with http(s)://
 * - Code elements: Adds language-auto class to inline code without a language class
 * - Table elements: Wraps tables in a div with overflow-x-auto for horizontal scrolling
 */
const rehypeHtmlEnhancements = (options: Options) => {
  const { sitePrefix } = options || { sitePrefix: '' };

  return (tree) => {
    visit(tree, 'element', (node: any, index, parent) => {
      // Handle anchor tags (external links)
      if (node.tagName === 'a') {
        const href = (node.properties?.href || '') as string;

        // Check if the link is external (starts with http:// or https://)
        if (/^https?:\/\//i.test(href)) {
          node.properties = node.properties || {};
          node.properties.target = '_blank';
          node.properties.rel = 'noopener noreferrer';
        }
      }

      // Handle code tags
      if (node.tagName === 'code') {
        node.properties = node.properties || {};
        const className = node.properties.className;

        // Check if className exists and is an array
        const classArray = Array.isArray(className) ? className : [];

        // Only add language-auto if no language- class is present
        const hasLanguageClass = classArray.some(
          (cls) => typeof cls === 'string' && cls.startsWith('language-'),
        );

        if (!hasLanguageClass) {
          node.properties.className = [...classArray, 'language-auto'];
        }
      }

      // Handle table tags - wrap in div with overflow-x-auto
      if (node.tagName === 'table' && parent && typeof index === 'number') {
        // Check if parent is already a div with overflow-x-auto
        const isAlreadyWrapped =
          parent.type === 'element' &&
          parent.tagName === 'div' &&
          Array.isArray(parent.properties?.className) &&
          parent.properties.className.includes('overflow-x-auto');

        if (!isAlreadyWrapped) {
          // Create wrapper div
          const wrapper = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['overflow-x-auto'],
            },
            children: [node],
          };

          // Replace table with wrapper
          parent.children[index] = wrapper;
        }
      }
    });
  };
};

export default rehypeHtmlEnhancements;
