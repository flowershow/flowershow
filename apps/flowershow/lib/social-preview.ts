import { createHash } from 'node:crypto';
import { Plan } from '@prisma/client';
import type { SiteConfig } from '@/components/types';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import { resolveListingImage } from '@/lib/listing/items';
import { DEFAULT_FIELDS } from '@/lib/listing/spec';
import { imageValue, siteImageKey } from '@/lib/post/hero';
import { getConfig } from '@/lib/app-config';
import { resolveNavBrand, resolveSiteName } from '@/lib/site-config';

/** Bump when the card design changes, so every cached card URL changes. */
export const CARD_VERSION = 2;

/** A picture for the card: a site file (read from storage) or an external https image. */
export interface CardImage {
  src: string;
  /** Blob path for a site file; null for an external image. */
  sitePath: string | null;
  width?: number;
  height?: number;
}

export interface CardInputs {
  siteName: string;
  logo: string | null;
  showMark: boolean;
  /** The picture card (A) when set; the text card (C) when null. */
  image: CardImage | null;
  /** null → the site-only card (protected site, missing page). */
  page: { title: string; section: string | null; sha: string } | null;
}

const asText = (v: unknown): string | null =>
  v == null || v === '' ? null : String(v);

const titleCase = (s: string) =>
  s
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());

const INDEX_RE = /^(readme|index)\.(md|mdx)$/i;

/** The page's top-level folder as a label ("blog/x.md" → "Blog"); none for root pages and a folder's own index. */
export function cardSection(blobPath: string): string | null {
  const parts = blobPath.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.length === 2 && INDEX_RE.test(parts[1]!)) return null;
  const label = titleCase(parts[0]!);
  const chars = Array.from(label);
  return chars.length > 32 ? `${chars.slice(0, 31).join('')}…` : label;
}

export function toCardInputs(a: {
  site: { plan?: Plan | null; privacyMode: string; projectName: string };
  siteConfig: SiteConfig | null;
  blob: { sha: string; path: string; metadata: unknown } | null;
  slug: string;
  pageImage?: CardImage | null;
  siteImage?: CardImage | null;
}): CardInputs {
  // config.json may hold a non-string siteName (e.g. a number).
  const siteName = String(resolveSiteName(a.siteConfig, a.site.projectName));
  const metadata = (a.blob?.metadata ?? null) as Record<string, unknown> | null;
  const hidePage =
    a.site.privacyMode === 'PASSWORD' ||
    !a.blob ||
    !metadata ||
    metadata.publish === false;
  const isHome = a.slug === '/';
  // The same logo as the navbar: Flowershow's when the site sets none.
  const defaultLogo = getConfig().logo;
  const logo = asText(
    resolveNavBrand(a.siteConfig, siteName, defaultLogo).logo,
  );

  return {
    siteName,
    logo,
    // No second Flowershow mark when the logo already is Flowershow's.
    showMark: a.site.plan !== Plan.PREMIUM && logo !== defaultLogo,
    image: hidePage ? null : (a.pageImage ?? a.siteImage ?? null),
    page: hidePage
      ? null
      : {
          title: isHome ? siteName : (asText(metadata.title) ?? siteName),
          section: isHome ? null : cardSection(a.blob!.path),
          sha: a.blob!.sha,
        },
  };
}

export function socialCardVersion(c: CardInputs): string {
  return createHash('sha1')
    .update(JSON.stringify([CARD_VERSION, c]))
    .digest('hex')
    .slice(0, 10);
}

export function socialCardUrl(
  siteUrl: string,
  slug: string,
  v: string,
): string {
  return `${siteUrl}/_og${slug === '/' ? '' : slug}?v=${v}`;
}

/** The domain shown on the card (never the path: it is unreadable at chat size). */
export function cardDomain(siteUrl: string): string {
  try {
    return new URL(siteUrl).host;
  } catch {
    return siteUrl.replace(/^https?:\/\//, '').split('/')[0]!;
  }
}

export interface ImageContext {
  siteHostname: string;
  /** Site file paths with a leading slash (getAllBlobPaths). */
  files: string[];
  dimensions: ImageDimensionsMap;
}

/** Below this on its shorter side a picture is an icon or logo, not a picture. */
export const MIN_CARD_IMAGE_SIDE = 400;
const PICTURE_EXT_RE = /\.(png|jpe?g|webp|avif|gif)$/i;

/**
 * An `image` value (path, URL or [[wikilink]]) as a card picture: a site file
 * that exists with a known size of at least 400px a side, or an external https
 * image. Anything else (SVG, a page URL, an emoji, a missing file) is null, so
 * the page falls through to the next picture or the text card.
 */
export function resolveCardImage(
  raw: unknown,
  originPath: string,
  ctx: ImageContext,
): CardImage | null {
  const value = imageValue(raw);
  if (!value) return null;
  const src = resolveListingImage(value, originPath.replace(/^\/+/, ''), {
    siteHostname: ctx.siteHostname,
    files: ctx.files,
    fields: DEFAULT_FIELDS.list,
    locale: 'en-US',
  });
  if (!src) return null;
  let url: URL;
  let pathname: string;
  try {
    url = new URL(src);
    pathname = decodeURIComponent(url.pathname); // a stray `%` throws
  } catch {
    return null;
  }
  if (!PICTURE_EXT_RE.test(pathname)) return null;
  if (url.host !== ctx.siteHostname)
    return url.protocol === 'https:' ? { src, sitePath: null } : null;
  const key = siteImageKey(src, ctx.siteHostname, ctx.dimensions);
  const size = key ? ctx.dimensions[key] : undefined;
  if (!key || !size) return null;
  if (Math.min(size.width, size.height) < MIN_CARD_IMAGE_SIDE) return null;
  return {
    src,
    sitePath: key.replace(/^\/+/, ''),
    width: size.width,
    height: size.height,
  };
}

/** Already a share card (about 1.91:1, at least 1000px wide): used as it is rather than wrapped in another card. */
export function isShareCardShaped(img: CardImage): boolean {
  if (!img.width || !img.height) return false;
  const ratio = img.width / img.height;
  return img.width >= 1000 && ratio >= 1.8 && ratio <= 2.05;
}

export type SocialImage = { url: string; width?: number; height?: number };

const card = (url: string): SocialImage => ({ url, width: 1200, height: 630 });
const asIs = (img: CardImage): SocialImage => ({
  url: img.src,
  width: img.width,
  height: img.height,
});

export function resolveSocialImage(a: {
  cardsEnabled: boolean;
  isPremium: boolean;
  isProtected: boolean;
  isHome: boolean;
  pageImage: CardImage | null;
  siteImage: CardImage | null;
  /** Raw frontmatter / config values, for the pre-cards behaviour. */
  legacyPageImage: string | null;
  legacySiteImage: string | null;
  cardUrl: string;
  siteCardUrl: string;
  legacyThumbnail: string;
}): SocialImage | null {
  if (!a.cardsEnabled) {
    // Pre-cards behaviour, minus the `url: null` bug.
    if (!a.isPremium) return card(a.legacyThumbnail);
    const url = a.legacyPageImage ?? a.legacySiteImage;
    return url ? { url } : null;
  }
  if (a.isProtected) return card(a.siteCardUrl);
  if (a.pageImage && isShareCardShaped(a.pageImage)) return asIs(a.pageImage);
  // Home page: the site image as it is when it's a share card, or when its size
  // is unknown (a dashboard upload, often a designed card, or an external URL).
  const siteImg = a.siteImage;
  if (
    !a.pageImage &&
    a.isHome &&
    siteImg &&
    (isShareCardShaped(siteImg) || !siteImg.width)
  )
    return asIs(siteImg);
  // The card shows the page picture, else the site picture, else text alone.
  return card(a.cardUrl);
}

/**
 * og/twitter title and description. PASSWORD sites expose only the site name
 * and site description (from DB config, as the /_og card does), never page
 * data; the HTML <title> and meta description are not affected.
 */
export function socialText(a: {
  isProtected: boolean;
  title: string;
  description?: string;
  siteConfig: SiteConfig | null;
  projectName: string;
}): { title: string; description?: string } {
  if (!a.isProtected) return { title: a.title, description: a.description };
  return {
    title: String(resolveSiteName(a.siteConfig, a.projectName)),
    description: asText(a.siteConfig?.description) ?? undefined,
  };
}

export function buildSocialMetadata(a: {
  title: string;
  description?: string;
  url: string;
  image: SocialImage | null;
}) {
  const images = a.image ? [{ ...a.image, alt: a.title }] : undefined;
  return {
    openGraph: {
      title: a.title,
      description: a.description,
      type: 'website' as const,
      url: a.url,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? ('summary_large_image' as const) : ('summary' as const),
      title: a.title,
      description: a.description,
      ...(images ? { images } : {}),
    },
  };
}

/**
 * Image for a public page's metadata. Mirrors the /_og route's inputs so the
 * `v` we emit equals the `v` the route expects: protected sites use the DB
 * config only (`dbConfig`) and no blob; others use the file config, the blob
 * and the pictures from `loadCardImages`.
 */
export function resolvePageSocialImage(a: {
  cardsEnabled: boolean;
  isPremium: boolean;
  site: { plan?: Plan | null; privacyMode: string; projectName: string };
  siteConfig: SiteConfig | null;
  dbConfig: SiteConfig | null;
  blob: { sha: string; path: string; metadata: unknown } | null;
  siteUrl: string;
  slug: string;
  legacyThumbnail: string;
  pageImage: CardImage | null;
  siteImage: CardImage | null;
}): SocialImage | null {
  const isProtected = a.site.privacyMode === 'PASSWORD';
  const meta = (a.blob?.metadata ?? null) as { image?: unknown } | null;
  const cfg = isProtected ? a.dbConfig : a.siteConfig;
  const inputs = toCardInputs({
    site: a.site,
    siteConfig: cfg,
    blob: isProtected ? null : a.blob,
    slug: isProtected ? '/' : a.slug,
    pageImage: a.pageImage,
    siteImage: a.siteImage,
  });
  const siteInputs: CardInputs = { ...inputs, image: null, page: null };
  return resolveSocialImage({
    cardsEnabled: a.cardsEnabled,
    isPremium: a.isPremium,
    isProtected,
    isHome: a.slug === '/',
    pageImage: isProtected ? null : a.pageImage,
    siteImage: isProtected ? null : a.siteImage,
    legacyPageImage: asText(meta?.image),
    legacySiteImage: asText(cfg?.image),
    cardUrl: socialCardUrl(a.siteUrl, a.slug, socialCardVersion(inputs)),
    siteCardUrl: socialCardUrl(a.siteUrl, '/', socialCardVersion(siteInputs)),
    legacyThumbnail: a.legacyThumbnail,
  });
}
