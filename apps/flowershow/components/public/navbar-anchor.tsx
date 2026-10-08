'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AnchorHTMLAttributes } from 'react';

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

/** Path part (no query or hash) of a root-relative href, or null. */
function rootRelativePath(href: string): string | null {
  if (!href.startsWith('/') || href.startsWith('//')) return null;
  return href.split(/[?#]/)[0] || '/';
}

function normalizePath(path: string): string {
  let decoded = path;
  try {
    decoded = decodeURI(path);
  } catch {
    // Malformed escape: compare as-is.
  }
  return decoded.length > 1 ? decoded.replace(/\/+$/, '') : decoded;
}

/**
 * Extensions that mark a link as a file (served raw, or by a route handler)
 * rather than a page. Only these count: a dot alone doesn't, so page slugs
 * like `/releases/v1.2` or `/2024.01.05-notes` still navigate client-side.
 */
const FILE_EXTENSIONS = new Set(
  [
    // Content and data
    'md mdx markdown canvas base html htm txt xml rss atom json geojson',
    'yaml yml toml csv tsv ics ipynb',
    // Documents and archives
    'pdf epub doc docx xls xlsx ppt pptx odt ods odp zip gz tgz tar 7z',
    // Images, audio, video
    'png jpg jpeg gif svg webp avif ico bmp tif tiff',
    'mp3 wav ogg m4a flac mp4 webm mov m4v',
    // Web assets
    'css js mjs map wasm woff woff2 ttf otf',
  ]
    .join(' ')
    .split(' '),
);

function hasFileExtension(path: string): boolean {
  const lastSegment = path.split('/').pop() ?? '';
  const dot = lastSegment.lastIndexOf('.');
  return (
    dot > 0 && FILE_EXTENSIONS.has(lastSegment.slice(dot + 1).toLowerCase())
  );
}

/**
 * True when a link in the custom navbar (`_navbar.html`) is a same-site page
 * link that can be followed client-side with `next/link`: a root-relative
 * path (relative links are already resolved to root-relative ones by
 * `processHtmlFragment`), not ending in a known file extension (so
 * `/notes.md`, `/rss.xml`, `/assets/report.pdf` or `/page.html` stay plain
 * anchors, while `/releases/v1.2` doesn't), and no `target` or `download`. External, protocol-relative and
 * hash-only links are plain anchors too.
 */
export function isClientNavigable({
  href,
  target,
  download,
}: Pick<AnchorProps, 'href' | 'target' | 'download'>): boolean {
  if (typeof href !== 'string') return false;
  const path = rootRelativePath(href);
  if (path === null) return false;
  if (target && target !== '_self') return false;
  if (download !== undefined && download !== false) return false;
  return !hasFileExtension(path);
}

/**
 * True when `href` points at the page being viewed (ignoring the query string
 * and trailing slashes). Links with a `#fragment` are section links, never
 * the current page.
 */
export function isCurrentPage(
  href: string | undefined,
  pathname: string | null,
): boolean {
  if (typeof href !== 'string' || !pathname || href.includes('#')) {
    return false;
  }
  const path = rootRelativePath(href);
  return path !== null && normalizePath(path) === normalizePath(pathname);
}

/**
 * `<a>` in the custom navbar. Same-site page links use `next/link`, so the
 * primary navigation stays a soft navigation (with prefetch) like the default
 * navbar's; everything else is a plain anchor. The link to the current page
 * gets `aria-current="page"` unless the author set `aria-current` themselves.
 */
export default function NavbarAnchor({ href, ...props }: AnchorProps) {
  const pathname = usePathname();
  const ariaCurrent =
    props['aria-current'] ??
    (isCurrentPage(href, pathname) ? 'page' : undefined);

  if (href !== undefined && isClientNavigable({ href, ...props })) {
    return <Link href={href} {...props} aria-current={ariaCurrent} />;
  }
  return <a href={href} {...props} aria-current={ariaCurrent} />;
}
