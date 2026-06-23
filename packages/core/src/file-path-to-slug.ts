export const PAGE_FILE_EXTENSIONS = new Set(['md', 'mdx', 'canvas']);

export function filePathToSlug(filePath: string): string {
  filePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const lastDot = filePath.lastIndexOf('.');
  const lastSlash = filePath.lastIndexOf('/');
  const extWithDot = lastDot > lastSlash ? filePath.slice(lastDot) : '';
  const ext = extWithDot.slice(1);

  let withoutExt = PAGE_FILE_EXTENSIONS.has(ext)
    ? filePath.slice(0, filePath.length - extWithDot.length)
    : filePath;

  const parts = withoutExt.split('/');
  const basename = parts[parts.length - 1];
  if (basename === 'README' || basename === 'index') {
    withoutExt = parts.slice(0, -1).join('/') || '/';
  }

  if (!withoutExt || withoutExt === '/') return '/';
  withoutExt = withoutExt.replace(/\/$/, '');

  return withoutExt;
}

// Encodes each path segment with encodeURIComponent and replaces %20 with +.
// Apply after filePathToSlug where Flowershow-style space encoding is needed.
export function encodeSlug(slug: string): string {
  return slug
    .split('/')
    .map((s) => encodeURIComponent(s).replace(/%20/g, '+'))
    .join('/');
}
