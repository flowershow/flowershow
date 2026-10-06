import matter from 'gray-matter';

const WORDS_PER_MINUTE = 200;

/**
 * Counts the words a reader sees in a Markdown page: frontmatter, HTML tags,
 * link/image targets and Markdown punctuation are not words.
 */
export function countWords(markdown: string): number {
  let content = markdown;
  try {
    content = matter(markdown, {}).content;
  } catch {
    // Malformed frontmatter: count the raw text rather than fail the render.
  }
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\]\([^)]*\)/g, ' ')
    .replace(/[|[\]]/g, ' ');
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)?.length ?? 0;
}

/** "N min read", rounded up, at least 1 minute. */
export function formatReadingTime(wordCount: number): string {
  const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}

export function readingTime(markdown: string): string {
  return formatReadingTime(countWords(markdown));
}
