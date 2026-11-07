import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  TOC_HEADING_SELECTOR,
  collectHeadings,
  flattenToc,
  useTableOfContents,
} from './table-of-contents';

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

describe('flattenToc', () => {
  it('lists sections depth-first with depth 0/1 and drops deeper levels', () => {
    expect(
      flattenToc([
        {
          id: 'a',
          title: 'A',
          level: 'H2',
          children: [
            {
              id: 'b',
              title: 'B',
              level: 'H3',
              children: [{ id: 'c', title: 'C', level: 'H4', children: [] }],
            },
          ],
        },
      ]),
    ).toEqual([
      { id: 'a', title: 'A', depth: 0 },
      { id: 'b', title: 'B', depth: 1 },
    ]);
  });
});

describe('collectHeadings', () => {
  it('skips a heading with no id', () => {
    // jsdom has no innerText; mirror textContent
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent;
      },
    });
    document.body.innerHTML =
      '<div id="mdxpage"><h2>No id</h2><h2 id="x">X</h2></div>';
    const sections = collectHeadings(
      document.querySelectorAll(TOC_HEADING_SELECTOR),
    );
    expect(sections.map((s) => s.id)).toEqual(['x']);
    delete (HTMLElement.prototype as any).innerText;
  });
});

describe('useTableOfContents', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('re-measures heading positions on resize', () => {
    document.body.innerHTML = '<h2 id="one"></h2><h2 id="two"></h2>';
    const tops = { one: 0, two: 1000 };
    for (const id of ['one', 'two'] as const) {
      document.getElementById(id)!.getBoundingClientRect = () =>
        ({ top: tops[id] }) as DOMRect;
    }
    const toc = [
      { id: 'one', title: 'One', level: 'H2', children: [] },
      { id: 'two', title: 'Two', level: 'H2', children: [] },
    ];
    const { result } = renderHook(() => useTableOfContents(toc));
    expect(result.current).toBe('one');

    // Content above shifted (e.g. an image loaded): second heading is now at the top
    tops.two = 0;
    act(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe('two');
  });
});
