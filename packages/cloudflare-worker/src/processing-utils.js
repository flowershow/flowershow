import matter from 'gray-matter';
import { imageSize, types as supportedImageTypes } from 'image-size';

// Polyfill Buffer for browser environment
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
globalThis.Buffer = globalThis.Buffer || {
  from: (data) => {
    if (typeof data === 'string') {
      return textEncoder.encode(data);
    }
    return data;
  },
  toString: (buffer) => {
    return textDecoder.decode(buffer);
  },
};

export function normalizePermalink(permalink) {
  if (typeof permalink !== 'string') {
    return null;
  }

  return permalink.replace(/^\/+/, '').replace(/\/+$/, '');
}

function normalizeImageExtension(ext) {
  if (!ext) {
    return null;
  }

  if (ext === 'jpeg') {
    return 'jpg';
  }

  if (ext === 'tif') {
    return 'tiff';
  }

  return ext;
}

export function isSupportedImagePath(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  const normalizedExt = normalizeImageExtension(ext);
  return normalizedExt ? supportedImageTypes.includes(normalizedExt) : false;
}

export function extractImageDimensions(path, content) {
  if (!isSupportedImagePath(path)) {
    return { width: null, height: null };
  }

  const dimensions = imageSize(content);

  if (!dimensions.width || !dimensions.height) {
    return { width: null, height: null };
  }

  return {
    width: dimensions.width,
    height: dimensions.height,
  };
}

export async function parseMarkdownForSync({ markdown, path }) {
  let parsed;

  try {
    const { data: frontmatter, content: body } = matter(markdown, {});

    const title =
      frontmatter.title ||
      (await extractTitle(body)) ||
      path
        .split('/')
        .pop()
        ?.replace(/\.(mdx|md)$/, '') ||
      '';

    parsed = {
      metadata: {
        ...frontmatter,
        title,
      },
      body,
    };
  } catch (error) {
    throw new Error(`Error parsing markdown: ${error}`);
  }

  const metadata = /** @type {Record<string, unknown>} */ (
    parsed.metadata || {}
  );
  const publish = metadata.publish !== false;

  return {
    metadata: {
      ...metadata,
      publish,
    },
    body: parsed.body,
    permalink: normalizePermalink(metadata.permalink),
    shouldPublish: publish,
  };
}

export const extractTitle = async (source) => {
  const heading = source.trim().match(/^#{1}[ ]+(.*)/);
  if (heading?.[1]) {
    const title = heading[1]
      // replace wikilink with only text value
      .replace(/\[\[([\S\s]*?)]]/, '$1')
      // remove markdown formatting
      .replace(/[_*~`>]/g, '') // remove markdown characters
      .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // remove links but keep the text
    return title.trim();
  }
  return null;
};
