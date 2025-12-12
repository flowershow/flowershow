import { findMatchingFilePath } from '@flowershow/remark-wiki-link';
import { getWikiLinkValue } from './wiki-link';

/**
 * Only works with simple wiki-links, i.e. no headings or aliases,
 */
export const resolveWikiLinkToFilePath = ({
  wikiLink,
  filePaths,
}: {
  wikiLink: string; // [[wiki-link]] or [[some-image.jpg]]
  filePaths: string[];
}) => {
  const target = getWikiLinkValue(wikiLink);

  const matchingFilePath = findMatchingFilePath({
    path: target,
    files: filePaths,
    format: 'shortestPossible',
    caseInsensitive: false,
  });

  return matchingFilePath || target;
};
