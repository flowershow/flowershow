import matter from "gray-matter";

// Polyfill Buffer for browser environment
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
globalThis.Buffer = globalThis.Buffer || {
  from: (data) => {
    if (typeof data === "string") {
      return textEncoder.encode(data);
    }
    return data;
  },
  toString: (buffer) => {
    return textDecoder.decode(buffer);
  },
};

export async function parseMarkdownFile(markdown, path = "") {
  try {
    const { data: frontmatter, content: body } = matter(markdown, {});

    const title =
      frontmatter.title ||
      (await extractTitle(body)) ||
      path
        .split("/")
        .pop()
        ?.replace(/\.(mdx|md)$/, "") ||
      "";

    return {
      metadata: {
        ...frontmatter,
        title,
      },
      body,
    };
  } catch (error) {
    throw new Error(`Error parsing markdown: ${error}`);
  }
}

export const extractTitle = async (source) => {
  const heading = source.trim().match(/^#{1}[ ]+(.*)/);
  if (heading?.[1]) {
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
