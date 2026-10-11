import matter from 'gray-matter';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import { resolveListingImage } from '@/lib/listing/items';
import { DEFAULT_FIELDS } from '@/lib/listing/spec';

export type PostHero = {
  src: string;
  alt: string;
  caption: string | null;
  /** Width / height, clamped; null when the intrinsic size is unknown (CSS default 16/9). */
  ratio: number | null;
  width?: number;
  height?: number;
};

/** Never taller than 4:3: a square or portrait hero would push the text below the fold (it is cropped, object-fit: cover). */
const MIN_RATIO = 4 / 3;
const MAX_RATIO = 21 / 9;

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

/** Does the body reference this file name (as a whole file name, any case)? */
function bodyShows(body: string, src: string): boolean {
  let name: string;
  try {
    const u = new URL(src);
    name = decodeURIComponent(u.pathname.split('/').pop() ?? '');
  } catch {
    return false;
  }
  if (!name) return false;
  return new RegExp(
    `(?:^|[/\\[(\\s"'=|])${escapeRe(name)}(?=$|[\\])\\s"'#?|])`,
    'i',
  ).test(body);
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
  let dims: { width: number; height: number } | undefined;
  try {
    const u = new URL(src);
    if (u.host === siteHostname)
      dims = dimensions?.[decodeURIComponent(u.pathname)];
  } catch {
    // resolveListingImage only returns absolute URLs
  }
  const ratio =
    dims && dims.width > 0 && dims.height > 0
      ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, dims.width / dims.height))
      : null;
  return {
    src,
    alt: text(m.imageAlt) ?? '',
    caption: text(m.imageCaption),
    ratio,
    ...(dims ? { width: dims.width, height: dims.height } : {}),
  };
}
