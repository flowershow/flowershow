import { createHash } from 'node:crypto';
import { Plan } from '@prisma/client';
import type { SiteConfig } from '@/components/types';
import { resolveSiteName } from '@/lib/site-config';

/** Bump when the card design changes, so every cached card URL changes. */
export const CARD_VERSION = 1;

export interface CardInputs {
  siteName: string;
  siteDescription: string | null;
  logo: string | null;
  showMark: boolean;
  /** null → the site-only card (home without a blob, protected site, missing page). */
  page: { title: string; description: string | null; sha: string } | null;
}

const asText = (v: unknown): string | null =>
  v == null || v === '' ? null : String(v);

export function toCardInputs(a: {
  site: { plan?: Plan | null; privacyMode: string; projectName: string };
  siteConfig: SiteConfig | null;
  blob: { sha: string; metadata: unknown } | null;
}): CardInputs {
  // config.json may hold a non-string siteName (e.g. a number).
  const siteName = String(resolveSiteName(a.siteConfig, a.site.projectName));
  const metadata = (a.blob?.metadata ?? null) as Record<string, unknown> | null;
  const hidePage =
    a.site.privacyMode === 'PASSWORD' ||
    !a.blob ||
    !metadata ||
    metadata.publish === false;

  return {
    siteName,
    siteDescription: asText(a.siteConfig?.description),
    logo: asText(a.siteConfig?.logo ?? a.siteConfig?.nav?.logo),
    showMark: a.site.plan !== Plan.PREMIUM,
    page: hidePage
      ? null
      : {
          title: asText(metadata.title) ?? siteName,
          description: asText(metadata.description),
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

export function displayUrl(siteUrl: string, slug: string): string {
  const host = siteUrl.replace(/^https?:\/\//, '');
  const full = slug === '/' ? host : `${host}${slug}`;
  return full.length > 60 ? `${full.slice(0, 59)}…` : full;
}

export type SocialImage = { url: string; width?: number; height?: number };

const card = (url: string): SocialImage => ({ url, width: 1200, height: 630 });

export function resolveSocialImage(a: {
  cardsEnabled: boolean;
  isPremium: boolean;
  isProtected: boolean;
  pageImage: string | null;
  siteImage: string | null;
  cardUrl: string;
  siteCardUrl: string;
  legacyThumbnail: string;
}): SocialImage | null {
  if (!a.cardsEnabled) {
    // Pre-cards behaviour, minus the `url: null` bug.
    if (!a.isPremium) return card(a.legacyThumbnail);
    const url = a.pageImage ?? a.siteImage;
    return url ? { url } : null;
  }
  if (a.isProtected) return card(a.siteCardUrl);
  if (a.isPremium && a.pageImage) return { url: a.pageImage };
  if (a.isPremium && a.siteImage) return { url: a.siteImage };
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
 * config only (`dbConfig`) and no blob; others use the file config and blob.
 */
export function resolvePageSocialImage(a: {
  cardsEnabled: boolean;
  isPremium: boolean;
  site: { plan?: Plan | null; privacyMode: string; projectName: string };
  siteConfig: SiteConfig | null;
  dbConfig: SiteConfig | null;
  blob: { sha: string; metadata: unknown } | null;
  siteUrl: string;
  slug: string;
  legacyThumbnail: string;
}): SocialImage | null {
  const isProtected = a.site.privacyMode === 'PASSWORD';
  const meta = (a.blob?.metadata ?? null) as { image?: string } | null;
  const inputs = toCardInputs({
    site: a.site,
    siteConfig: isProtected ? a.dbConfig : a.siteConfig,
    blob: isProtected ? null : a.blob,
  });
  const siteInputs = { ...inputs, page: null };
  const cfg = isProtected ? a.dbConfig : a.siteConfig;
  return resolveSocialImage({
    cardsEnabled: a.cardsEnabled,
    isPremium: a.isPremium,
    isProtected,
    pageImage: meta?.image || null,
    siteImage: cfg?.image || null,
    cardUrl: socialCardUrl(a.siteUrl, a.slug, socialCardVersion(inputs)),
    siteCardUrl: socialCardUrl(a.siteUrl, '/', socialCardVersion(siteInputs)),
    legacyThumbnail: a.legacyThumbnail,
  });
}
