import { z } from 'zod';
import type { SiteConfig } from '@/components/types';

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

const navLinkSchema = z.object({
  name: z.string(),
  href: z.string(),
});

/**
 * Shape of `footer.navigation`: an array of groups, each with a `title` and a
 * `links` array of {name, href}. Enforced on save so malformed config (e.g. a
 * flat list of links) can't be persisted and later crash the public Footer,
 * which renders in the layout on every page.
 */
export const footerNavigationSchema = z.array(
  z.object({
    title: z.string(),
    links: z.array(navLinkSchema),
  }),
);

/**
 * Validates a site config patch before it is persisted. Currently guards
 * `footer.navigation`; a `null` value (clearing the field) or an absent field
 * is allowed. Throws an Error with a user-facing message on invalid shapes.
 */
export function validateConfigPatch(patch: Record<string, unknown>): void {
  const footer = patch.footer;
  if (!isPlainObject(footer) || !('navigation' in footer)) return;

  const navigation = footer.navigation;
  if (navigation == null) return; // clearing the field is allowed

  const result = footerNavigationSchema.safeParse(navigation);
  if (!result.success) {
    throw new Error(
      'Invalid footer navigation. Expected an array of groups, each with a ' +
        '"title" and a "links" array of { name, href }. ' +
        'Example: [{"title":"Docs","links":[{"name":"Getting Started","href":"/docs"}]}]',
    );
  }
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
 * Merges dashboard DB config (configJson) with file-based config (config.json).
 * File config wins: config.json overrides dashboard values.
 * Nested objects are deep-merged; arrays are replaced wholesale.
 */
export function resolveSiteConfig(
  dbConfig: SiteConfig | null | undefined,
  fileConfig: SiteConfig | null | undefined,
): SiteConfig {
  let resolved: SiteConfig;
  if (!dbConfig && !fileConfig) return {};
  if (!dbConfig) resolved = fileConfig ?? {};
  else if (!fileConfig) resolved = dbConfig;
  else
    resolved = deepMerge(
      dbConfig as Record<string, unknown>,
      fileConfig as Record<string, unknown>,
    ) as SiteConfig;

  if (resolved.umami !== undefined) {
    resolved = { ...resolved, umami: normalizeUmamiConfig(resolved.umami) };
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
