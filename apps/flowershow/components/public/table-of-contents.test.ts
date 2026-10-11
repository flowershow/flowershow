import { describe, expect, it } from 'vitest';
import { TOC_HEADING_SELECTOR } from './table-of-contents';

describe('TOC_HEADING_SELECTOR', () => {
  it('skips headings marked data-toc-ignore', () => {
    document.body.innerHTML =
      '<div id="mdxpage"><h2 id="a">A</h2><h3 data-toc-ignore="">Item</h3><h3 id="b">B</h3></div>';
    expect(
      [...document.querySelectorAll(TOC_HEADING_SELECTOR)].map(
        (h) => h.textContent,
      ),
    ).toEqual(['A', 'B']);
  });
});
