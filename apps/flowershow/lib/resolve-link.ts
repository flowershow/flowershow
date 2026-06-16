import { slug } from 'github-slugger';
import * as path from 'path';
import { env } from '../env.mjs';
import { customEncodeUrl, ensureLeadingSlash } from './url-encoder';

const PAGE_FILE_EXTENSIONS = new Set(['md', 'mdx', 'canvas']);

/**
 * Resolve a render-time link target (href or src) to a URL path or full asset URL.
 * @param opts.target  - Value of the href or src (relative or absolute)
 * @param opts.originFilePath  - Absolute path to the file where the link is (you can skip it if it's a root level file (e.g. top config.json))
 * @param opts.siteHostname  - The serving hostname for this site (custom domain or subdomain.flowershow.site). Required for asset src URLs.
 * @param opts.permalinks  - Map of file paths to permalinks
 * @example
 * resolveContentLink({ target: "blog/post-abc", originFilePath: "/README.md" })
 * resolveContentLink({ target: "assets/image.jpg", originFilePath: "config.json", siteHostname: "garden-johndoe.flowershow.site" })
 */
export const resolveContentLink = ({
  target,
  originFilePath = '/',
  siteHostname,
  commonMarkSpaceEncoded = false,
  permalinks,
}: {
  target: string;
  originFilePath?: string;
  siteHostname?: string;
  commonMarkSpaceEncoded?: boolean;
  permalinks?: Record<string, string>;
}) => {
  if (
    target.startsWith('http') ||
    target.startsWith('mailto:') ||
    target.startsWith('tel:')
  ) {
    return target;
  }

  // Remove space encoding (required in CommonMark links)
  if (commonMarkSpaceEncoded) {
    target = target
      .split('/')
      .map((p) => p.replaceAll('%20', ' '))
      .join('/');
  }

  const [, filePath = '', heading = ''] =
    target.match(/^(.*?)(?:#(.*))?$/u) || [];

  const headingId = heading ? `#${slug(heading)}` : '';

  if (!filePath && headingId) return headingId;

  const origin = ensureLeadingSlash(originFilePath);

  // Resolve relative path to absolute path
  const resolvedPath = filePath.startsWith('/')
    ? filePath
    : path.resolve(path.dirname(origin), filePath);

  // Classify: page file (render as slug) vs raw asset (render as full URL)
  // (Specifically: full URL is required for Next.js Image compatibility)
  const extWithDot = path.extname(resolvedPath);
  const ext = extWithDot.slice(1);
  const isPageFile = PAGE_FILE_EXTENSIONS.has(ext) || !ext;

  if (!isPageFile) {
    const isSecure =
      env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
      env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
    const encoded = resolvedPath
      .split('/')
      .map((p) => encodeURIComponent(p))
      .join('/');
    return `${isSecure ? 'https' : 'http'}://${siteHostname}${encoded}`;
  }

  // Page file — compute URL slug
  const permalink = permalinks?.[resolvedPath];
  let urlPath: string;
  if (permalink) {
    urlPath = permalink;
  } else {
    // Strip page file extension
    const withoutExt = PAGE_FILE_EXTENSIONS.has(ext)
      ? resolvedPath.slice(0, resolvedPath.length - extWithDot.length)
      : resolvedPath;

    // Normalise README/index to directory root
    const base = path.basename(withoutExt);
    urlPath =
      base === 'README' || base === 'index'
        ? path.dirname(withoutExt)
        : withoutExt;

    urlPath = !urlPath || urlPath === '/' ? '/' : urlPath.replace(/\/$/, '');
  }

  const encoded = urlPath
    .split('/')
    .map((p) => customEncodeUrl(p))
    .join('/');
  return `${encoded}${headingId}`;
};
