import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { describe, expect, test } from 'vitest';
import { processMarkdown } from './markdown';

// Regression: a `.md` page with raw HTML carrying a malformed inline `style`
// attribute (e.g. `<div style=vv{{...}}>`) used to hang the Markdown render
// path forever. rehype-raw parses it into a broken `style` prop, then
// hast-util-to-jsx-runtime (our rehype-to-react compiler) throws while building
// the React tree. That throw detached into an unhandled rejection and the
// `unified().process()` promise never settled — so the request ran until the
// Vercel function timed out (a 504) instead of showing an error.
//
// The fix catches the throw inside the compiler and returns an error card, so
// the render resolves fast with a visible, catchable error.
const MALFORMED = `# Hello, world!

Below is an example of markdown in JSX.

<div style=vv{{backgroundColor: 'violet', padding: '1rem'}}>
  Try and change the background color to \`tomato\`.
</div>
`;

const baseOptions = {
  files: [],
  filePath: '/hello.md',
  siteHostname: 'example.flowershow.app',
  permalinks: {},
} as any;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(label)), ms),
    ),
  ]);
}

describe('rehype-to-react compiler resilience', () => {
  test('malformed inline style in raw HTML does not hang the MD renderer', async () => {
    const result = await withTimeout(
      processMarkdown(MALFORMED, baseOptions),
      5000,
      'processMarkdown hung — regression of the 504 inline-style bug',
    );

    expect(result).toBeTruthy();
    const html = renderToStaticMarkup(result as ReactElement);
    expect(html).toContain('Error rendering markdown');
  });

  test('well-formed inline style still renders normally', async () => {
    const result = await withTimeout(
      processMarkdown(
        `<div style="background-color: violet; padding: 1rem">ok</div>`,
        baseOptions,
      ),
      5000,
      'processMarkdown hung on valid content',
    );

    const html = renderToStaticMarkup(result as ReactElement);
    expect(html).not.toContain('Error rendering markdown');
    expect(html).toContain('ok');
  });
});
