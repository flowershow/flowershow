import { describe, expect, test } from 'vitest';
import { extractDescription } from './description';

describe('extractDescription', () => {
  test('returns the opening sentence, not the whole paragraph', () => {
    expect(
      extractDescription('Flowershow turns your markdown notes into a website in seconds. It is free to start. More here.'),
    ).toBe('Flowershow turns your markdown notes into a website in seconds.');
  });

  test('adds following sentences when the opening one is very short', () => {
    expect(extractDescription('Hi there. This post explains how I publish my notes online. Then more detail follows here.')).toBe(
      'Hi there. This post explains how I publish my notes online.',
    );
  });

  test('does not split on common abbreviations', () => {
    expect(
      extractDescription('Use tools e.g. Obsidian or Logseq to write the notes for your digital garden. Then publish.'),
    ).toBe('Use tools e.g. Obsidian or Logseq to write the notes for your digital garden.');
  });

  test('does not split on decimals or a sentence ending in a quote', () => {
    expect(extractDescription('Version 2.5 ships "today." It is good.')).toBe('Version 2.5 ships "today." It is good.');
  });

  test('returns a one-sentence paragraph as plain text', () => {
    expect(
      extractDescription('This is a paragraph with **bold text**, _italic text_, and ~~strikethrough text~~.\n\nSecond.'),
    ).toBe('This is a paragraph with bold text, italic text, and strikethrough text.');
  });

  test('skips a leading H1 and other headings', () => {
    expect(extractDescription('# Title\n\n## Sub\n\nFirst para.')).toBe('First para.');
  });

  test('joins a paragraph that spans several lines', () => {
    expect(extractDescription('Line one\nline two.')).toBe('Line one line two.');
  });

  test.each([
    ['callout', '> [!note] Heads up\n> inside\n\nReal text.'],
    ['blockquote', '> quoted\n\nReal text.'],
    ['image embed', '![[cover.png]]\n\nReal text.'],
    ['markdown image', '![alt](/a.png)\n\nReal text.'],
    ['fenced code', '```js\nconst a = 1;\n```\n\nReal text.'],
    ['tilde fence', '~~~\ncode\n~~~\n\nReal text.'],
    ['list', '- one\n- two\n\nReal text.'],
    ['ordered list', '1. one\n2. two\n\nReal text.'],
    ['table', '| a | b |\n|---|---|\n| 1 | 2 |\n\nReal text.'],
    ['html', '<div class="x">hi</div>\n\nReal text.'],
    ['mdx import', "import X from './x'\n\nReal text."],
    ['math block', '$$\nx^2\n$$\n\nReal text.'],
    ['obsidian comment', '%% private %%\n\nReal text.'],
    ['html comment', '<!-- hidden -->\n\nReal text.'],
    ['horizontal rule', '---\n\nReal text.'],
  ])('skips a leading %s', (_name, body) => {
    expect(extractDescription(body)).toBe('Real text.');
  });

  test('turns links and wikilinks into their text', () => {
    expect(
      extractDescription('See [the docs](https://x.y) and [[Some Page|this page]] and [[Other Page#Section]].'),
    ).toBe('See the docs and this page and Other Page.');
  });

  test('drops inline code ticks, footnote refs, highlights and html tags', () => {
    expect(extractDescription('Run `fl publish`[^1] ==now== <b>today</b>.')).toBe(
      'Run fl publish now today.',
    );
  });

  test('keeps snake_case words intact', () => {
    expect(extractDescription('Set max_retries to 3.')).toBe('Set max_retries to 3.');
  });

  test('truncates at a word boundary with an ellipsis', () => {
    const body = `${'word '.repeat(60)}end.`;
    const out = extractDescription(body)!;
    expect(out.length).toBeLessThanOrEqual(140);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });

  test('hard-cuts a single unbroken token', () => {
    const out = extractDescription('x'.repeat(400))!;
    expect(out).toHaveLength(140);
    expect(out.endsWith('…')).toBe(true);
  });

  test.each([[''], ['# Only a heading'], ['![[only.png]]'], ['   \n\n  ']])(
    'returns null when there is no prose: %j',
    (body) => {
      expect(extractDescription(body)).toBeNull();
    },
  );

  test('handles CRLF line endings', () => {
    expect(extractDescription('# T\r\n\r\nHello there.\r\n')).toBe('Hello there.');
  });

  test('strips leading heading without blank line separator', () => {
    expect(extractDescription('# Title\nFirst paragraph here.')).toBe('First paragraph here.');
  });

  test('strips leading image embed without blank line separator', () => {
    expect(extractDescription('![[cover.png]]\nIntro text.')).toBe('Intro text.');
  });

  test('strips leading import statement without blank line separator', () => {
    expect(extractDescription("import X from './x'\nIntro.")).toBe('Intro.');
  });

  test('handles curly quotes in sentence splitting', () => {
    expect(extractDescription('He said “hi there to you all today and much more to say.” Then he left.')).toBe(
      'He said “hi there to you all today and much more to say.”',
    );
  });

  test('handles straight quotes in sentence splitting', () => {
    expect(extractDescription('The guide says "publish your notes as a website today." Then it explains how.')).toBe(
      'The guide says "publish your notes as a website today."',
    );
  });

  describe('obsidian / markdown openings that are not prose', () => {
    test.each([
      ['tag-only line then blank line', '#book #reading\n\nReal text.'],
      [
        'tag-only line directly before prose',
        '#book #reading/fiction\nReal text.',
      ],
      ['single tag line', '#draft\nReal text.'],
      [
        'dataview inline fields then blank line',
        'rating:: 5\nauthor:: Jane Doe\n\nReal text.',
      ],
      [
        'dataview inline field directly before prose',
        'status:: in progress\nReal text.',
      ],
      ['setext H1 heading', 'Title\n=====\n\nReal text.'],
      ['setext H2 heading', 'Title\n-----\n\nReal text.'],
      ['setext heading directly before prose', 'My Title\n=====\nReal text.'],
      [
        'multi-line opening JSX tag',
        '<Callout\n  type="info">\nReal text.\n</Callout>',
      ],
      [
        'multi-line opening JSX tag with braces and >',
        '<Box\n  style={{ a: 1 }}\n  title="a > b"\n>\n\nReal text.',
      ],
      [
        'multi-line self-closing JSX tag',
        '<Hero\n  image="/a.png"\n/>\n\nReal text.',
      ],
      ['unclosed multi-line tag', '<Callout\n  type="info"\n\nReal text.'],
    ])('skips a leading %s', (_name, body) => {
      expect(extractDescription(body)).toBe('Real text.');
    });

    test('a multi-line opening tag leaks no markup into the description', () => {
      const out = extractDescription(
        '<Callout\n  type="info"\n  title="Note">\nHi there. This is the callout body text for the page.\n</Callout>',
      )!;
      expect(out).toBe('Hi there. This is the callout body text for the page.');
      expect(out).not.toMatch(/[<>="]/);
    });

    test('keeps prose that mentions a hashtag or a double colon', () => {
      expect(
        extractDescription('#1 priority is shipping the new release today.'),
      ).toBe('#1 priority is shipping the new release today.');
      expect(
        extractDescription(
          'Use std::vector for dynamic arrays in modern C++ code.',
        ),
      ).toBe('Use std::vector for dynamic arrays in modern C++ code.');
    });
  });
});
