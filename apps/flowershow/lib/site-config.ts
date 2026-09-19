import { isNavDropdown, type SiteConfig } from '@/components/types';
import { isEmoji } from './is-emoji';
import { resolveContentLink } from './resolve-link';
import { sanitizeSiteConfig } from './site-config-schema';

export {
  strictSiteConfigSchema,
  validateConfigPatch,
} from './site-config-schema';

// Coerces the legacy string form of umami config (plain website ID) to the
// canonical object form. The string form is deprecated — use { websiteId, src? }.
function normalizeUmamiConfig(
  umami: SiteConfig['umami'] | string,
): SiteConfig['umami'] {
  if (typeof umami === 'string') return { websiteId: umami };
  return umami;
}

export const SITE_CONFIG_DEFAULTS = {
  showToc: true,
  showKnowledgeGraph: false,
  showSidebar: true,
  showComments: false,
  showBacklinks: true,
  enableSearch: false,
  enableRss: false,
  showBuiltWithButton: true,
  showRawLink: false,
  showEditLink: false,
  syntaxMode: 'auto' as const,
} satisfies Partial<SiteConfig>;

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>,
): T {
  const result = { ...base };
  for (const key of Object.keys(override) as Array<keyof T>) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>,
      ) as T[typeof key];
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[typeof key];
    }
  }
  return result;
}

/**
 * Rewrites relative media/link targets in a resolved config to their serving
 * URLs, in place. Mutates only the freshly-sanitized/merged config, never the
 * caller's input. Emoji logos/favicons are left untouched. Assumes the config
 * has already been sanitized, so shapes are trustworthy.
 */
function resolveConfigLinks(config: SiteConfig, siteHostname: string): void {
  const resolve = (target: string) =>
    resolveContentLink({ target, siteHostname });
  const record = config as Record<string, unknown>;

  // Top-level media paths → full URLs (favicon/logo may be an emoji instead).
  (['image', 'logo', 'favicon', 'thumbnail'] as const).forEach((key) => {
    const value = record[key];
    if (typeof value !== 'string') return;
    if ((key === 'favicon' || key === 'logo') && isEmoji(value)) return;
    record[key] = resolve(value);
  });

  if (config.nav?.links) {
    config.nav.links.forEach((item) => {
      if (isNavDropdown(item)) {
        item.links.forEach((link) => {
          link.href = resolve(link.href);
        });
      } else {
        item.href = resolve(item.href);
      }
    });
  }

  if (config.nav?.logo && !isEmoji(config.nav.logo)) {
    config.nav.logo = resolve(config.nav.logo);
  }

  if (config.nav?.social) {
    config.nav.social.forEach((social) => {
      social.href = resolve(social.href);
    });
  }

  if (config.nav?.cta) {
    config.nav.cta.href = resolve(config.nav.cta.href);
  }

  if (
    config.hero &&
    typeof config.hero === 'object' &&
    !Array.isArray(config.hero)
  ) {
    if (typeof config.hero.image === 'string') {
      config.hero.image = resolve(config.hero.image);
    }
    if (Array.isArray(config.hero.cta)) {
      config.hero.cta.forEach((c) => {
        if (typeof c?.href === 'string') c.href = resolve(c.href);
      });
    }
  }

  if (Array.isArray(config.footer?.navigation)) {
    config.footer.navigation.forEach((group) => {
      if (!Array.isArray(group?.links)) return;
      group.links.forEach((link) => {
        link.href = resolve(link.href);
      });
    });
  }
}

/**
 * Single pipeline for turning raw DB + file config into a safe, resolved
 * SiteConfig:
 *   sanitize(db) → sanitize(file) → deepMerge (file wins) → resolve links.
 *
 * Each source is sanitized *before* the merge so malformed data in one source
 * can't wipe a valid field in the other, and so no malformed field can reach
 * the public site (which renders config in the layout on every page). File
 * config wins; nested objects are deep-merged, arrays replaced wholesale.
 *
 * Link resolution is opt-in via `opts.siteHostname` — callers that only need
 * the merged values (RSS, branding) omit it and get no rewriting. Stays
 * synchronous.
 */
export function resolveSiteConfig(
  dbConfig: SiteConfig | null | undefined,
  fileConfig: SiteConfig | null | undefined,
  opts?: { siteHostname?: string; siteId?: string },
): SiteConfig {
  const db = sanitizeSiteConfig(dbConfig, { siteId: opts?.siteId });
  const file = sanitizeSiteConfig(fileConfig, { siteId: opts?.siteId });

  let resolved = deepMerge(
    db as Record<string, unknown>,
    file as Record<string, unknown>,
  ) as SiteConfig;

  if (resolved.umami !== undefined) {
    resolved = { ...resolved, umami: normalizeUmamiConfig(resolved.umami) };
  }

  if (opts?.siteHostname) {
    resolveConfigLinks(resolved, opts.siteHostname);
  }

  return resolved;
}

/**
 * Resolves the site's brand/name — the single value shown as the SEO title
 * suffix, navbar name, footer publication name, and RSS channel title.
 */
export function resolveSiteName(
  siteConfig: SiteConfig | null | undefined,
  projectName: string,
): string {
  return siteConfig?.siteName ?? siteConfig?.title ?? projectName;
}

/**
 * Builds a page's `<title>` from the page title and the resolved brand.
 */
export function buildPageTitle(
  pageTitle: string | null | undefined,
  siteName: string,
): string {
  if (!pageTitle) return siteName;
  if (pageTitle.trim().toLowerCase() === siteName.trim().toLowerCase()) {
    return siteName;
  }
  return `${pageTitle} | ${siteName}`;
}
