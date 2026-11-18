import {
  encodeSlug,
  filePathToSlug,
  PAGE_FILE_EXTENSIONS,
} from './file-path-to-slug';

/** Extensions converted to Markdown on upload (stored under a derived prefix). */
export const CONVERTIBLE_EXTENSIONS: ReadonlySet<string> = new Set(['docx']);

/** Extensions that render as pages; for Prisma `extension: { in: ... }`. */
export const MARKDOWN_LIKE_EXTENSIONS: readonly string[] = [
  'md',
  'mdx',
  'docx',
];

const DERIVED_URL_PREFIX = '_derived';

function extOf(path: string): string {
  const lastDot = path.lastIndexOf('.');
  const lastSlash = path.lastIndexOf('/');
  return lastDot > lastSlash ? path.slice(lastDot + 1).toLowerCase() : '';
}

export function isConvertiblePath(path: string): boolean {
  return CONVERTIBLE_EXTENSIONS.has(extOf(path));
}

export function isMarkdownLikePage(path: string): boolean {
  return MARKDOWN_LIKE_EXTENSIONS.includes(extOf(path));
}

/** Derived prefix, relative to `{siteId}/main/`. */
export function derivedPrefix(path: string): string {
  return `derived/${path}/`;
}

export function derivedMarkdownKey(
  siteId: string,
  path: string,
  sha: string,
): string {
  return `${siteId}/main/${derivedPrefix(path)}${sha}/index.md`;
}

export function derivedAssetKey(
  siteId: string,
  path: string,
  sha: string,
  name: string,
): string {
  return `${siteId}/main/${derivedPrefix(path)}${sha}/${name}`;
}

export function derivedAssetUrlPath(
  path: string,
  sha: string,
  name: string,
): string {
  const encodedPath = path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `/${DERIVED_URL_PREFIX}/${encodedPath}/${sha}/${name}`;
}

/**
 * Map a decoded `_derived/...` request path to its R2 key suffix
 * (`derived/{path}/{sha}/{name}`), or null if invalid.
 */
export function parseDerivedUrlPath(urlPath: string): string | null {
  const trimmed = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  const segments = trimmed.split('/');
  if (segments[0] !== DERIVED_URL_PREFIX) return null;
  const rest = segments.slice(1);
  if (rest.length === 0) return null;
  if (rest.some((s) => s === '' || s === '.' || s === '..')) return null;
  return `derived/${rest.join('/')}`;
}

/** Page slug for page or convertible files; null for anything else. */
export function pageSlugFromPath(path: string): string | null {
  const ext = extOf(path);
  if (PAGE_FILE_EXTENSIONS.has(ext)) {
    return encodeSlug(filePathToSlug(path));
  }
  if (CONVERTIBLE_EXTENSIONS.has(ext)) {
    // Treat like a markdown page: strip the extension, then apply the usual
    // index/README folder-index rule. filePathToSlug itself is left unchanged.
    const stripped = path.slice(0, path.length - ext.length - 1);
    return encodeSlug(filePathToSlug(`${stripped}.md`));
  }
  return null;
}
