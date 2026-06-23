import { matchLinkTarget } from '@flowershow/core';

/**
 * Extracts the value from a wiki link ([[target]] or [[target|alias]]),
 * returning null if the string is not a wiki link.
 */
export function extractWikiLinkValue(text: string): string | null {
  const match = text.match(/^\[\[([^|]+?)(?:\|.+?)?\]\]$/);
  return match?.[1] ?? null;
}

/** Only works with simple wiki-links, i.e. no headings or aliases. */
export const resolveWikiLinkToFilePath = ({
  wikiLink,
  filePaths,
}: {
  wikiLink: string; // [[wiki-link]] or [[some-image.jpg]]
  filePaths: string[];
}) => {
  const target = extractWikiLinkValue(wikiLink) ?? wikiLink;
  return (
    matchLinkTarget(
      target,
      filePaths.map((p) => ({ path: p })),
      {
        caseInsensitive: false,
      },
    )?.path ?? target
  );
};
