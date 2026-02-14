import type { SiteConfig } from '@/components/types';
import type { PageMetadata } from '@/server/api/types';

type HeroLayout = 'right' | 'full';

type HeroObject = {
  title?: string;
  description?: string;
  image?: string;
  cta?: Array<{ href: string; label: string }>;
  imagelayout?: string;
};

export type ResolvedHeroConfig = {
  showHero: boolean;
  title?: string;
  description?: string;
  image?: string;
  cta?: Array<{ href: string; label: string }>;
  imageLayout?: HeroLayout;
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

type TopLevelFields = {
  title?: string;
  description?: string;
  image?: string;
  cta?: Array<{ href: string; label: string }>;
};

const resolveFromHeroObject = (
  hero: HeroObject,
  topLevel: TopLevelFields,
): ResolvedHeroConfig => ({
  showHero: true,
  title: typeof hero.title === 'string' ? hero.title : topLevel.title,
  description:
    typeof hero.description === 'string'
      ? hero.description
      : topLevel.description,
  image: typeof hero.image === 'string' ? hero.image : topLevel.image,
  cta: Array.isArray(hero.cta) ? hero.cta : topLevel.cta,
  imageLayout: normalizeImageLayout(hero.imagelayout),
});

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
