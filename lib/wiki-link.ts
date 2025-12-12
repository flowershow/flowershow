/**
 * Checks if a string is in wiki link format ([[...]])
 * @param text - String to check
 * @returns true if the string is a wiki link
 */
export function isWikiLink(text: string): boolean {
  const wikiLinkRegex = /^\[\[(.+?)\]\]$/;
  return wikiLinkRegex.test(text);
}

/**
 * Gets the raw value from a wiki link without the brackets and alias
 * @param wikiLink - String containing wiki link e.g. [[image.jpg]] or [[image.jpg|alt text]]
 * @returns The inner value without brackets and alias
 * @throws Error if input is not a wiki link
 */
export function getWikiLinkValue(wikiLink: string): string {
  if (!isWikiLink(wikiLink)) {
    throw new Error('Input is not a wiki link');
  }
  const match = wikiLink.match(/^\[\[([^|]+?)(?:\|.+?)?\]\]$/);
  if (!match?.[1]) {
    console.error('Failed to extract wiki link value');
    return wikiLink;
  }
  return match[1];
}

/**
 * Finds a matching permalink that ends with the given file path
 * @param permalinks - Array of possible permalinks
 * @param filePath - File path to match against the end of permalinks
 * @returns Matching permalink or null if none found
 */
export function findMatchingPermalink(
  permalinks: string[],
  filePath: string,
): string | null {
  // Normalize the file path by ensuring forward slashes
  const normalizedFilePath = filePath.replace(/\\/g, '/');

  // Find a permalink that ends with the file path
  return (
    permalinks.find(
      (permalink) =>
        permalink.endsWith('/' + normalizedFilePath) ||
        permalink.endsWith(normalizedFilePath),
    ) || null
  );
}
