/**
 * Raw HTML `<img>` in a `.md` file goes through `components.img` (FsImage) and
 * must keep the attributes the author wrote.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { processMarkdown } from './markdown';

async function renderMd(source: string) {
  return renderToStaticMarkup(
    await processMarkdown(source, {
      filePath: 'note.md',
      files: [],
      siteHostname: 'test.flowershow.site',
    }),
  );
}

describe('HTML <img> in .md', () => {
  it('keeps author width and height', async () => {
    const html = await renderMd(
      '<img src="/a.png" alt="A" width="300" height="100">',
    );

    expect(html).toMatch(/<img[^>]*width="300"/);
    expect(html).toMatch(/<img[^>]*height="100"/);
  });
});
