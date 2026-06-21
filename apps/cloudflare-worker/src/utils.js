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

/**
 * Parse the R2/S3 object key into its components.
 * Expected format: {siteId}/{branch}/raw/{path}
 */
export function parseObjectKey(rawKey) {
  const m = rawKey.match(/^([^/]+)\/([^/]+)\/raw\/(.+)$/);
  if (!m) throw new Error(`Invalid key format: ${rawKey}`);
  const [, siteId, branch, path] = m;
  return { siteId, branch, path };
}

export function normalizePermalink(permalink) {
  if (typeof permalink !== 'string') {
    return null;
  }

  const trimmed = permalink.replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed ? `/${trimmed}` : null;
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

export function generateId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  return `c${timestamp}${random}`;
}

export async function captureError(env, properties) {
  if (!env.POSTHOG_KEY) return;
  try {
    const host = env.POSTHOG_HOST || 'https://eu.i.posthog.com';
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.POSTHOG_KEY,
        event: '$exception',
        distinct_id: 'system',
        properties,
      }),
    });
  } catch {
    // Never let PostHog errors affect the worker
  }
}
