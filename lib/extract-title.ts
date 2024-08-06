// Description: Extract title from markdown source.

export const extractTitle = async (source: string) => {
  const heading = source.trim().match(/^#\s+(.*)$/m);
  if (heading && heading[1]) {
    const title = heading[1]
      // replace wikilink with only text value
      .replace(/\[\[([\S\s]*?)]]/, "$1")
      // remove markdown formatting
      .replace(/[_*~`>]/g, "") // remove markdown characters
      .replace(/\[(.*?)\]\(.*?\)/g, "$1"); // remove links but keep the text
    return title.trim();
  }
  return null;
};
