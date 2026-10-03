import { afterEach, describe, expect, it } from 'vitest';
import {
  anchorSelector,
  describeRange,
  getRootText,
  rangeFromOffsets,
} from './anchoring';

function makeRoot(html: string): HTMLElement {
  document.body.innerHTML = `<h1 id="title">Page title</h1><div id="mdxpage">${html}</div><footer id="foot">Footer text</footer>`;
  return document.getElementById('mdxpage') as HTMLElement;
}

/** Range over the first occurrence of `needle` inside one text node. */
function rangeOver(container: Node, needle: string): Range {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const index = (node as Text).data.indexOf(needle);
    if (index !== -1) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + needle.length);
      return range;
    }
  }
  throw new Error(`not found: ${needle}`);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('describeRange', () => {
  it('captures the quote, context and text offsets across inline elements', () => {
    const root = makeRoot(
      '<p>The quick <strong>brown</strong> fox jumps over the lazy dog.</p>',
    );
    const range = document.createRange();
    range.setStart(root.querySelector('strong')!.firstChild!, 0);
    range.setEnd(root.querySelector('p')!.lastChild!, 4); // " fox"
    expect(describeRange(root, range)).toEqual({
      selector: {
        exact: 'brown fox',
        prefix: 'The quick ',
        suffix: ' jumps over the lazy dog.',
        start: 10,
        end: 19,
      },
      truncated: false,
    });
  });

  it('keeps at most 32 characters of context', () => {
    const root = makeRoot(`<p>${'a'.repeat(50)}TARGET${'b'.repeat(50)}</p>`);
    const { selector } = describeRange(root, rangeOver(root, 'TARGET'))!;
    expect(selector.prefix).toBe('a'.repeat(32));
    expect(selector.suffix).toBe('b'.repeat(32));
    expect(selector.start).toBe(50);
  });

  it('trims whitespace that double-click selections pick up', () => {
    const root = makeRoot('<p>The quick brown fox</p>');
    const { selector } = describeRange(root, rangeOver(root, ' brown '))!;
    expect(selector.exact).toBe('brown');
    expect(selector.start).toBe(10);
  });

  it('ignores whitespace-only and collapsed selections', () => {
    const root = makeRoot('<p>The quick brown fox</p>');
    expect(describeRange(root, rangeOver(root, ' '))).toBeNull();
    const collapsed = document.createRange();
    collapsed.setStart(root.querySelector('p')!.firstChild!, 3);
    expect(describeRange(root, collapsed)).toBeNull();
  });

  it('clamps selections that start or end outside the page body to the body', () => {
    const root = makeRoot('<p>The quick brown fox</p>');
    const fromTitle = document.createRange();
    fromTitle.setStart(document.getElementById('title')!.firstChild!, 0);
    fromTitle.setEnd(root.querySelector('p')!.firstChild!, 5);
    expect(describeRange(root, fromTitle)!.selector).toMatchObject({
      exact: 'The q',
      start: 0,
      end: 5,
    });
    const intoFooter = document.createRange();
    intoFooter.setStart(root.querySelector('p')!.firstChild!, 10);
    intoFooter.setEnd(document.getElementById('foot')!.firstChild!, 6);
    expect(describeRange(root, intoFooter)!.selector).toMatchObject({
      exact: 'brown fox',
      start: 10,
      end: 19,
    });
  });

  it('returns null for a selection entirely outside the page body', () => {
    makeRoot('<p>The quick brown fox</p>');
    expect(
      describeRange(
        document.getElementById('mdxpage')!,
        rangeOver(document.getElementById('title')!, 'Page'),
      ),
    ).toBeNull();
  });

  it('clamps very long selections to 1000 characters and says so', () => {
    const root = makeRoot(`<p>${'x'.repeat(1100)} tail</p>`);
    const range = document.createRange();
    range.selectNodeContents(root.querySelector('p')!);
    const result = describeRange(root, range)!;
    expect(result.truncated).toBe(true);
    expect(result.selector.exact).toHaveLength(1000);
    expect(result.selector.end - result.selector.start).toBe(1000);
    expect(result.selector.suffix.startsWith('x')).toBe(true);
  });
});

describe('rangeFromOffsets', () => {
  it('round-trips offsets to a DOM range across elements', () => {
    const root = makeRoot('<p>The quick <strong>brown</strong> fox jumps.</p>');
    expect(rangeFromOffsets(root, 10, 19)!.toString()).toBe('brown fox');
    expect(getRootText(root)).toBe('The quick brown fox jumps.');
  });

  it('returns null for offsets past the end', () => {
    expect(rangeFromOffsets(makeRoot('<p>short</p>'), 2, 99)).toBeNull();
  });
});

describe('anchorSelector', () => {
  const selector = {
    exact: 'brown fox',
    prefix: 'The quick ',
    suffix: ' jumps over',
    start: 10,
    end: 19,
  };

  it('uses the stored position when quote and context still match', () => {
    expect(
      anchorSelector('The quick brown fox jumps over the dog.', selector),
    ).toEqual({ start: 10, end: 19 });
  });

  it('follows text that moved', () => {
    expect(
      anchorSelector(
        'New intro. The quick brown fox jumps over the dog.',
        selector,
      ),
    ).toEqual({ start: 21, end: 30 });
  });

  it('picks the occurrence whose context matches when the quote repeats', () => {
    const repeated = {
      exact: 'the',
      prefix: 'cat sat. ',
      suffix: ' dog ran',
      start: 0,
      end: 3,
    };
    expect(anchorSelector('the cat sat. the dog ran.', repeated)).toEqual({
      start: 13,
      end: 16,
    });
  });

  it('survives a small edit inside the quote', () => {
    const text = 'The quick brown fax jumps over the dog.';
    const anchor = anchorSelector(text, selector)!;
    expect(text.slice(anchor.start, anchor.end)).toBe('brown fax');
  });

  it('gives up (outdated) when the quoted text is gone', () => {
    expect(
      anchorSelector('Completely different words now.', selector),
    ).toBeNull();
  });

  it('skips the fuzzy pass for long quotes that are no longer there verbatim', () => {
    const long = 'word '.repeat(80).trim(); // 399 chars
    const edited = long.replace('word word', 'word ward');
    expect(
      anchorSelector(edited, {
        exact: long,
        prefix: '',
        suffix: '',
        start: 0,
        end: long.length,
      }),
    ).toBeNull();
  });
});
