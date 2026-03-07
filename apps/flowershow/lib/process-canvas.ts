/**
 * Process a JSON Canvas file for standalone page rendering.
 *
 * For standalone canvas pages, text nodes are processed through a markdown
 * pipeline so they render with full formatting (headings, callouts, code, etc).
 *
 * For inline canvas embeds (via rehype plugin), text nodes are rendered as
 * plain text — see rehype-json-canvas.ts.
 */

import remarkCallout from '@r4ai/remark-callout';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeStringify from 'rehype-stringify';
import * as runtime from 'react/jsx-runtime';
import { unified } from 'unified';
import {
  type CanvasData,
  type CanvasNode,
  type CanvasRenderOptions,
  parseCanvasData,
  renderCanvas,
} from './canvas-renderer';

/**
 * Render markdown text to an HTML string using a lightweight pipeline.
 * Supports GFM, callouts, math, and syntax highlighting.
 */
async function renderMarkdownToHtml(text: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkCallout)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex, { output: 'htmlAndMathml' })
    .use(rehypePrismPlus, { ignoreMissing: true })
    .use(rehypeStringify)
    .process(text);

  return String(result);
}

/**
 * Process canvas for standalone page rendering.
 *
 * Processes markdown in text nodes, then renders the canvas as HTML with
 * positioned divs for nodes and an SVG overlay for edges.
 */
export async function processCanvas(
  content: string,
  config?: Partial<CanvasRenderOptions>,
): Promise<React.JSX.Element> {
  const canvas = parseCanvasData(content);

  // Process markdown in text nodes
  const processedNodes: CanvasNode[] = await Promise.all(
    canvas.nodes.map(async (node) => {
      if (node.type === 'text' && node.text) {
        const html = await renderMarkdownToHtml(node.text);
        return { ...node, text: html, _htmlProcessed: true } as CanvasNode & {
          _htmlProcessed: boolean;
        };
      }
      return node;
    }),
  );

  const processedCanvas: CanvasData = {
    nodes: processedNodes,
    edges: canvas.edges,
  };

  const hast = renderCanvas(processedCanvas, config);

  // Mark processed text nodes to use dangerouslySetInnerHTML
  // Walk the HAST tree and find canvas-node-content divs whose parent has processed text
  markProcessedHtmlNodes(hast, processedNodes);

  const element = toJsxRuntime(hast, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
  }) as React.JSX.Element;

  return runtime.jsx('div', {
    className: 'canvas-page',
    children: element,
  });
}

function hasClass(el: any, cls: string): boolean {
  const cn = el.properties?.className;
  if (Array.isArray(cn)) return cn.includes(cls);
  return cn === cls;
}

/**
 * Walk HAST tree and convert text content nodes that contain processed HTML
 * into raw HTML nodes so they render as rich markdown.
 */
function markProcessedHtmlNodes(
  node: any,
  processedNodes: Array<CanvasNode & { _htmlProcessed?: boolean }>,
) {
  if (!node.children) return;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];

    // Find canvas-node divs and check if their text was processed
    if (
      child.type === 'element' &&
      child.tagName === 'div' &&
      hasClass(child, 'canvas-node')
    ) {
      const nodeId = child.properties?.['data-node-id'];
      const processed = processedNodes.find(
        (n) => n.id === nodeId && (n as any)._htmlProcessed,
      );

      if (processed) {
        // Find the canvas-node-content child and replace its text with raw HTML
        for (let j = 0; j < (child.children?.length ?? 0); j++) {
          const contentDiv = child.children[j];
          if (
            contentDiv.type === 'element' &&
            contentDiv.tagName === 'div' &&
            hasClass(contentDiv, 'canvas-node-content')
          ) {
            // Replace text children with raw HTML
            contentDiv.children = [
              { type: 'raw', value: processed.text ?? '' },
            ];
          }
        }
      }
    }

    markProcessedHtmlNodes(child, processedNodes);
  }
}
