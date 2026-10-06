import { describe, expect, it } from 'vitest';
import { countWords, formatReadingTime, readingTime } from './reading-time';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

describe('formatReadingTime', () => {
  it('rounds up to whole minutes at 200 words per minute', () => {
    expect(formatReadingTime(200)).toBe('1 min read');
    expect(formatReadingTime(201)).toBe('2 min read');
    expect(formatReadingTime(1600)).toBe('8 min read');
  });

  it('shows at least 1 minute for very short content', () => {
    expect(formatReadingTime(1)).toBe('1 min read');
    expect(formatReadingTime(0)).toBe('1 min read');
  });
});

describe('countWords', () => {
  it('ignores frontmatter', () => {
    expect(
      countWords('---\ntitle: A long title here\n---\none two three'),
    ).toBe(3);
  });

  it('ignores markdown syntax, HTML tags and link targets', () => {
    const md = [
      '# Heading one',
      '',
      '- **bold** item',
      '[link text](https://example.com/a/b) and ![alt](/img.png)',
      '<div class="note">inside</div>',
      '[[Wiki Page|alias]]',
    ].join('\n');
    // Heading one bold item link text and alt inside Wiki Page alias
    expect(countWords(md)).toBe(12);
  });

  it('returns 0 for empty content', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n')).toBe(0);
  });
});

describe('readingTime', () => {
  it('computes from page content', () => {
    expect(readingTime(words(200))).toBe('1 min read');
    expect(readingTime(words(401))).toBe('3 min read');
  });
});
