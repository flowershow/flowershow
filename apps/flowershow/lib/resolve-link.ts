import {
  encodeSlug,
  filePathToSlug,
  isConvertiblePath,
  PAGE_FILE_EXTENSIONS,
  pageSlugFromPath,
} from '@flowershow/core';
import { slug } from 'github-slugger';
import * as path from 'path';
import { env } from '../env.mjs';
import { ensureLeadingSlash } from './utils';

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

const assetProtocol = () =>
  env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
    ? 'https'
    : 'http';

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

  // Images of a converted Word document: the converter writes them already
  // URL-encoded (derivedAssetUrlPath), so make them absolute without encoding
  // them a second time (`%2B` must not become `%252B`).
  if (target.startsWith('/_derived/')) {
    return `${assetProtocol()}://${siteHostname}${target}`;
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
    const encoded = resolvedPath
      .split('/')
      .map((p) => encodeURIComponent(p))
      .join('/');
    return `${assetProtocol()}://${siteHostname}${encoded}`;
  }

  // Page file — compute URL slug
  const permalink = permalinks?.[resolvedPath];
  const urlPath = permalink ?? encodeSlug(filePathToSlug(resolvedPath));
  return `${urlPath}${headingId}`;
};

/**
 * URL for a wiki link once remark-wiki-link has matched it to `filePath`.
 * A Word file matched by its name without extension (`[[report]]`) links to
 * its converted page; with the extension (`[[report.docx]]`) it stays a link
 * to the file itself, like `[x](report.docx)`.
 */
export const resolveWikiLinkUrl = ({
  filePath,
  heading,
  target,
  siteHostname,
}: {
  filePath: string;
  heading?: string;
  target?: string;
  siteHostname?: string;
}) => {
  if (isConvertiblePath(filePath) && !isConvertiblePath(target ?? filePath)) {
    const urlPath = pageSlugFromPath(ensureLeadingSlash(filePath));
    if (urlPath) return `${urlPath}${heading ? `#${slug(heading)}` : ''}`;
  }
  return resolveContentLink({
    target: `${filePath}${heading ? `#${heading}` : ''}`,
    siteHostname,
  });
};

/**
 * URL for a search hit's `path` (the indexed file path). A Word document's
 * hit links to its converted page, not to the file itself.
 */
export const searchHitUrl = (filePath: string) => {
  if (isConvertiblePath(filePath)) {
    const urlPath = pageSlugFromPath(ensureLeadingSlash(filePath));
    if (urlPath) return urlPath;
  }
  return resolveContentLink({ target: filePath });
};
