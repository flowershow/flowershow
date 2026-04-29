import type { SiteConfig, SiteConfigJson } from '@/components/types';

type ResolvableConfig = SiteConfigJson | SiteConfig | null | undefined;

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function deepMerge<T extends Record<string, unknown>>(
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
  dbConfig: ResolvableConfig,
  fileConfig: ResolvableConfig,
): SiteConfigJson {
  const base = (dbConfig ?? {}) as SiteConfigJson;
  const override = (fileConfig ?? {}) as SiteConfigJson;

  if (!dbConfig && !fileConfig) return {};
  if (!dbConfig) return override;
  if (!fileConfig) return base;

  return deepMerge(
    base as Record<string, unknown>,
    override as Record<string, unknown>,
  ) as SiteConfigJson;
}
