import { fromHtml } from 'hast-util-from-html';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import rehypeListingHeadings from './rehype-listing-headings';

describe('rehypeListingHeadings', () => {
  it('strips placeholder ids and does not shift real heading slugs', async () => {
    const p = unified()
      .use(rehypeSlug)
      .use(rehypeListingHeadings)
      .use(rehypeStringify);
    const tree = fromHtml(
      '<h3 class="list-component-item-headline" id="listing-item-heading">Intro</h3><h2>Intro</h2>',
      { fragment: true },
    );
    expect(String(p.stringify((await p.run(tree)) as any))).toBe(
      '<h3 class="list-component-item-headline">Intro</h3><h2 id="intro">Intro</h2>',
    );
  });
});
