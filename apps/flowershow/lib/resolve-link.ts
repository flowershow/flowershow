import {
  encodeSlug,
  filePathToSlug,
  PAGE_FILE_EXTENSIONS,
} from '@flowershow/core';
import { slug } from 'github-slugger';
import * as path from 'path';
import { env } from '../env.mjs';
import { ensureLeadingSlash } from './url-encoder';

/**
 * Resolve a link target to an absolute content path.
 * Decodes %20 space encoding and strips heading fragments.
 * Returns '' when the target is heading-only (no file path).
 */
export function resolveToAbsolutePath(
  target: string,
  originFilePath: string,
): string {
  const decoded = target
    .split('/')
    .map((p) => p.replaceAll('%20', ' '))
    .join('/');
  const [, pathPart = ''] = decoded.match(/^(.*?)(?:#.*)?$/u) || [];
  if (!pathPart) return '';
  const origin = ensureLeadingSlash(originFilePath);
  if (pathPart.startsWith('/')) return pathPart;
  return path.resolve(path.dirname(origin), pathPart);
}

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
  permalinks,
}: {
  target: string;
  originFilePath?: string;
  siteHostname?: string;
  permalinks?: Record<string, string>;
}) => {
  if (
    target.startsWith('http') ||
    target.startsWith('mailto:') ||
    target.startsWith('tel:')
  ) {
    return target;
  }

  const [, , heading = ''] = target.match(/^(.*?)(?:#(.*))?$/u) || [];
  const headingId = heading ? `#${slug(heading)}` : '';

  const resolvedPath = resolveToAbsolutePath(target, originFilePath);

  if (!resolvedPath) return headingId;

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
  const urlPath = permalink ?? encodeSlug(filePathToSlug(resolvedPath));
  return `${urlPath}${headingId}`;
};
