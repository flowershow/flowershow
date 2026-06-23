import { matchLinkTarget } from '@flowershow/core';
import { extractWikiLinkValue } from './wiki-link';

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
