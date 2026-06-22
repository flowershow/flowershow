// Node.js-compatible copy for e2e test seeding. Must stay in sync with the
// canonical implementation in apps/cloudflare-worker/src/queue-consumer.js.
import * as path from 'path';

const PAGE_FILE_EXTENSIONS = new Set(['md', 'mdx', 'canvas']);

function customEncodeUrl(segment: string): string {
  return encodeURIComponent(segment).replace(/%20/g, '+').replace(/%2F/g, '/');
}

export function filePathToSlug(filePath: string): string {
  filePath = filePath.startsWith('/') ? filePath : `/${filePath}`;

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
