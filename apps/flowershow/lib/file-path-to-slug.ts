import * as path from 'path';
import { customEncodeUrl, ensureLeadingSlash } from './url-encoder';

const PAGE_FILE_EXTENSIONS = new Set(['md', 'mdx', 'canvas']);

/**
 * Convert an absolute file path to a URL slug with a leading slash.
 * Spaces are encoded as `+`. Page file extensions (md, mdx, canvas) are stripped.
 * README and index filenames are normalised to their directory root.
 *
 * @example
 * filePathToSlug('/blog/Cool Post.md')  // → '/blog/Cool+Post'
 * filePathToSlug('/README.md')           // → '/'
 * filePathToSlug('notes/file.md')        // → '/notes/file' (relative path normalised)
 */
export function filePathToSlug(filePath: string): string {
  filePath = ensureLeadingSlash(filePath);

  const extWithDot = path.extname(filePath);
  const ext = extWithDot.slice(1);

  let withoutExt = PAGE_FILE_EXTENSIONS.has(ext)
    ? filePath.slice(0, filePath.length - extWithDot.length)
    : filePath;

  const basename = path.basename(withoutExt);
  if (basename === 'README' || basename === 'index') {
    withoutExt = path.dirname(withoutExt);
  }

  if (!withoutExt || withoutExt === '/') return '/';

  withoutExt = withoutExt.replace(/\/$/, '');

  return withoutExt
    .split('/')
    .map((segment) => customEncodeUrl(segment))
    .join('/');
}
