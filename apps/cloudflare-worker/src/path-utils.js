export const PAGE_EXTENSIONS = new Set(['md', 'mdx', 'canvas']);

function normalizeUrlPath(p) {
  const withLeading = p?.startsWith('/') ? p : `/${p}`;
  return withLeading.replace(/\/$/, '');
}

function isPathIncluded(p, collection) {
  p = normalizeUrlPath(p);
  return collection.some((item) => {
    item = normalizeUrlPath(item);
    return item === p || p.startsWith(`${item}/`);
  });
}

export function isPathVisible(p, includes, excludes) {
  const normalized = normalizeUrlPath(p);
  if (normalized === '/config.json' || normalized === '/custom.css')
    return true;
  if (isPathIncluded(p, excludes)) return false;
  if (isPathIncluded(p, includes)) return true;
  return !includes[0];
}

function customEncodeSegment(segment) {
  return encodeURIComponent(segment).replace(/%20/g, '+').replace(/%2F/g, '/');
}

export function filePathToSlug(filePath) {
  filePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const lastDot = filePath.lastIndexOf('.');
  const lastSlash = filePath.lastIndexOf('/');
  const extWithDot = lastDot > lastSlash ? filePath.slice(lastDot) : '';
  const ext = extWithDot.slice(1);

  let withoutExt = PAGE_EXTENSIONS.has(ext)
    ? filePath.slice(0, filePath.length - extWithDot.length)
    : filePath;

  const parts = withoutExt.split('/');
  const basename = parts[parts.length - 1];
  if (basename === 'README' || basename === 'index') {
    withoutExt = parts.slice(0, -1).join('/') || '/';
  }

  if (!withoutExt || withoutExt === '/') return '/';
  withoutExt = withoutExt.replace(/\/$/, '');

  return withoutExt.split('/').map(customEncodeSegment).join('/');
}

export function getContentType(extension) {
  const types = {
    md: 'text/markdown',
    mdx: 'text/markdown',
    html: 'text/html',
    csv: 'text/csv',
    geojson: 'application/geo+json',
    json: 'application/json',
    yaml: 'application/yaml',
    yml: 'application/yaml',
    canvas: 'application/json',
    base: 'application/yaml',
    css: 'text/css',
    js: 'text/javascript',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    webp: 'image/webp',
    avif: 'image/avif',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    webm: 'video/webm',
    aac: 'audio/aac',
    mp3: 'audio/mpeg',
    opus: 'audio/opus',
  };
  return types[extension] || 'application/json';
}
