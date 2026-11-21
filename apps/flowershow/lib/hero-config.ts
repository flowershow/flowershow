import type { SiteConfig } from '@/components/types';
import type { PageMetadata } from '@/server/api/types';

type HeroLayout = 'right' | 'full';
export type HeroOverlay = 'dark' | 'light' | 'none';

type HeroObject = {
  title?: string;
  description?: string;
  image?: string;
  cta?: Array<{ href: string; label: string }>;
  imagelayout?: string;
  overlay?: unknown;
};

export type ResolvedHeroConfig = {
  showHero: boolean;
  title?: string;
  description?: string;
  image?: string;
  cta?: Array<{ href: string; label: string }>;
  imageLayout?: HeroLayout;
  /** Only set when imageLayout is 'full'. */
  overlay?: HeroOverlay;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeImageLayout = (value: unknown): HeroLayout | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'full' || normalized === 'right') {
    return normalized;
  }
  return undefined;
};

const DEFAULT_OVERLAY: HeroOverlay = 'dark';
const OVERLAYS: readonly HeroOverlay[] = ['dark', 'light', 'none'];

// Frontmatter and config.json are untrusted. Only an exact (case-insensitive)
// match on one of the named values is accepted; anything else (numbers,
// objects, CSS or HTML strings) falls back to the default. The value never
// reaches CSS: it is mapped to a fixed class name (HERO_OVERLAY_CLASS).
const normalizeOverlay = (value: unknown): HeroOverlay => {
  if (typeof value !== 'string') return DEFAULT_OVERLAY;
  const normalized = value.toLowerCase();
  return OVERLAYS.find((overlay) => overlay === normalized) ?? DEFAULT_OVERLAY;
};

/** Fixed lookup from overlay to class name on `.page-hero.image-full`. */
export const HERO_OVERLAY_CLASS: Record<HeroOverlay, string | undefined> = {
  dark: 'overlay-dark',
  light: 'overlay-light',
  none: undefined,
};

type TopLevelFields = {
  title?: string;
  description?: string;
  image?: string;
  cta?: Array<{ href: string; label: string }>;
};

const resolveFromHeroObject = (
  hero: HeroObject,
  topLevel: TopLevelFields,
): ResolvedHeroConfig => {
  const imageLayout = normalizeImageLayout(hero.imagelayout);
  return {
    showHero: true,
    title: typeof hero.title === 'string' ? hero.title : topLevel.title,
    description:
      typeof hero.description === 'string'
        ? hero.description
        : topLevel.description,
    image: typeof hero.image === 'string' ? hero.image : topLevel.image,
    cta: Array.isArray(hero.cta) ? hero.cta : topLevel.cta,
    imageLayout,
    overlay:
      imageLayout === 'full' ? normalizeOverlay(hero.overlay) : undefined,
  };
};

export const resolveHeroConfig = (
  metadata?: PageMetadata | null,
  siteConfig?: SiteConfig | null,
): ResolvedHeroConfig => {
  const metadataHero = metadata?.hero;
  const siteHero = siteConfig?.hero;

  if (metadataHero !== undefined) {
    if (isObject(metadataHero)) {
      return resolveFromHeroObject(metadataHero as HeroObject, {
        title: metadata?.title,
        description: metadata?.description,
        image: metadata?.image,
        cta: metadata?.cta,
      });
    }

    if (typeof metadataHero === 'boolean') {
      return {
        showHero: metadataHero,
        title: metadata?.title,
        description: metadata?.description,
        image: metadata?.image,
        cta: metadata?.cta,
        imageLayout: undefined,
      };
    }
  }

  if (siteHero !== undefined) {
    if (isObject(siteHero)) {
      return resolveFromHeroObject(siteHero as HeroObject, {
        title: metadata?.title,
        description: metadata?.description,
        image: metadata?.image,
        cta: metadata?.cta,
      });
    }

    if (typeof siteHero === 'boolean') {
      return {
        showHero: siteHero,
        title: metadata?.title,
        description: metadata?.description,
        image: metadata?.image,
        cta: metadata?.cta,
        imageLayout: undefined,
      };
    }
  }

  return {
    showHero: metadata?.showHero ?? siteConfig?.showHero ?? false,
    title: metadata?.title,
    description: metadata?.description,
    image: metadata?.image,
    cta: metadata?.cta,
    imageLayout: undefined,
  };
};
