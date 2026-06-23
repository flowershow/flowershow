/**
 * Extracts the value from a wiki link ([[target]] or [[target|alias]]),
 * returning null if the string is not a wiki link.
 */
export function extractWikiLinkValue(text: string): string | null {
  const match = text.match(/^\[\[([^|]+?)(?:\|.+?)?\]\]$/);
  return match?.[1] ?? null;
}
