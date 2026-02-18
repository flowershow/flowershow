/**
 * Copied from packages/cloudflare-worker/src/processing-utils.js
 * Keep in sync with the original when making changes.
 */
import matter from 'gray-matter';
import { imageSize, types as supportedImageTypes } from 'image-size';

function normalizePermalink(permalink: unknown): string | null {
  if (typeof permalink !== 'string') {
    return null;
  }

  return permalink.replace(/^\/+/, '').replace(/\/+$/, '');
}

function normalizeImageExtension(ext: string | undefined): string | null {
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

function isSupportedImagePath(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const normalizedExt = normalizeImageExtension(ext);
  return normalizedExt
    ? supportedImageTypes.includes(
        normalizedExt as (typeof supportedImageTypes)[number],
      )
    : false;
}

export function extractImageDimensions(
  filePath: string,
  content: Buffer,
): { width: number | null; height: number | null } {
  if (!isSupportedImagePath(filePath)) {
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

async function extractTitle(source: string): Promise<string | null> {
  const heading = source.trim().match(/^#{1}[ ]+(.*)/);
  if (heading?.[1]) {
    const title = heading[1]
      .replace(/\[\[([\S\s]*?)]]/, '$1')
      .replace(/[_*~`>]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1');
    return title.trim();
  }
  return null;
}

export async function parseMarkdownForSync({
  markdown,
  path: filePath,
}: {
  markdown: string;
  path: string;
}): Promise<{
  metadata: Record<string, unknown>;
  body: string;
  permalink: string | null;
  shouldPublish: boolean;
}> {
  let parsed: { metadata: Record<string, unknown>; body: string };

  try {
    const { data: frontmatter, content: body } = matter(markdown, {});

    const title =
      frontmatter.title ||
      (await extractTitle(body)) ||
      filePath
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

  const metadata = parsed.metadata || {};
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
