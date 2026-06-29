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
  showKnowledgeGraph: true,
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
