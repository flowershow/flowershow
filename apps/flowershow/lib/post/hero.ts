import matter from 'gray-matter';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import { resolveListingImage } from '@/lib/listing/items';
import { DEFAULT_FIELDS } from '@/lib/listing/spec';

export type PostHero = {
  src: string;
  alt: string;
  caption: string | null;
  /** The intrinsic size when the site knows it (site images); unknown for external URLs. */
  width?: number;
  height?: number;
};

/**
 * A cover must look like a cover. When the size is known, smaller or squarer
 * images (a logo, an icon, a portrait) are not shown: the post keeps them as
 * its social card. Unknown sizes render at their natural size, uncropped,
 * never upscaled, with a capped height (CSS), so a bad `image` is harmless.
 */
export const MIN_COVER_WIDTH = 600;
export const MIN_COVER_RATIO = 1.2;

const text = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

/** YAML reads an unquoted Obsidian `[[x]]` as [["x"]]. */
function imageValue(v: unknown): string | null {
  if (Array.isArray(v) && v.length === 1) {
    const inner = Array.isArray(v[0]) && v[0].length === 1 ? v[0][0] : v[0];
    return typeof inner === 'string' && inner.trim()
      ? Array.isArray(v[0])
        ? `[[${inner.trim()}]]`
        : inner.trim()
      : null;
  }
  return text(v);
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const pathnameOf = (src: string) => {
  try {
    return decodeURIComponent(new URL(src).pathname);
  } catch {
    return '';
  }
};
/** The page source without its frontmatter (whose `image:` would always match). */
function bodyOf(content: string): string {
  try {
    return matter(content).content;
  } catch {
    return content;
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `%20`-style escapes decoded one by one (a stray `%` never throws). */
const decodePercent = (s: string) =>
  s.replace(/(?:%[0-9a-f]{2})+/gi, (m) => {
    try {
      return decodeURIComponent(m);
    } catch {
      return m;
    }
  });

/**
 * Does the body reference this file name (as a whole file name, any case),
 * in any form: `![[x.png]]`, `![[path/x.png|300]]`, `![](x%20y.png)`,
 * `![](<x y.png>)`, `<img src="x.png">`, a bare URL?
 */
function bodyShows(body: string, src: string): boolean {
  const name = decodePercent(pathnameOf(src).split('/').pop() ?? '');
  if (!name) return false;
  const text = decodePercent(body.replace(/&amp;/g, '&'));
  return new RegExp(
    `(?:^|[/\\[(<\\s"'=|])${escapeRe(name)}(?=$|[\\])>\\s"'#?|])`,
    'i',
  ).test(text);
}

/** The site's intrinsic size for a site image URL: the longest dimensions-map key its path ends with (a path prefix such as /@user/site does not matter). */
function knownSize(
  src: string,
  siteHostname: string,
  dimensions: ImageDimensionsMap | undefined,
): { width: number; height: number } | undefined {
  if (!dimensions) return undefined;
  let path: string;
  try {
    const u = new URL(src);
    if (u.host !== siteHostname) return undefined;
    path = decodePercent(u.pathname);
  } catch {
    return undefined;
  }
  if (dimensions[path]) return dimensions[path];
  let best: string | undefined;
  for (const key of Object.keys(dimensions))
    if (path.endsWith(key) && (!best || key.length > best.length)) best = key;
  return best ? dimensions[best] : undefined;
}

/**
 * The post's hero image: the `image` frontmatter (only `image`, not the
 * listing-card fallbacks), resolved like listing images. Null when absent,
 * not an image, turned off (`showImage: false`), shown by the full-width Hero
 * (`showHero: true`) or already in the body.
 */
export function resolvePostHero({
  metadata,
  body,
  pagePath,
  files,
  siteHostname,
  permalinks,
  dimensions,
}: {
  metadata: Record<string, unknown> | null | undefined;
  body: string;
  pagePath: string;
  files: string[];
  siteHostname: string;
  permalinks?: Record<string, string>;
  dimensions?: ImageDimensionsMap;
}): PostHero | null {
  const m = metadata ?? {};
  if (m.showImage === false || m.showImage === 'false') return null;
  if (m.showHero === true || m.showHero === 'true') return null;
  const raw = imageValue(m.image);
  if (!raw) return null;
  const src = resolveListingImage(raw, pagePath.replace(/^\/+/, ''), {
    siteHostname,
    files,
    permalinks,
    fields: DEFAULT_FIELDS.list,
    locale: 'en-US',
  });
  // External images too must look like image files: a page URL would be a broken LCP image
  if (!src || !IMAGE_EXT_RE.test(pathnameOf(src))) return null;
  if (bodyShows(bodyOf(body), src)) return null;
  const dims = knownSize(src, siteHostname, dimensions);
  if (
    dims &&
    (dims.width < MIN_COVER_WIDTH ||
      dims.height <= 0 ||
      dims.width / dims.height < MIN_COVER_RATIO)
  )
    return null;
  return {
    src,
    alt: text(m.imageAlt) ?? '',
    caption: text(m.imageCaption),
    ...(dims ? { width: dims.width, height: dims.height } : {}),
  };
}
