import { entryTitleFromPath } from '@/lib/changelog';
import type { ListingGroup } from './spec';

export const DEFAULT_LOCALE = 'en-US';

export function resolveLocale(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c !== 'string' || !c.trim()) continue;
    try {
      if (Intl.DateTimeFormat.supportedLocalesOf([c.trim()]).length)
        return c.trim();
    } catch {
      // invalid tag: try the next one
    }
  }
  return DEFAULT_LOCALE;
}

const fmt = new Map<string, Intl.DateTimeFormat>();
function formatter(
  locale: string,
  opts: Intl.DateTimeFormatOptions,
  key: string,
) {
  const k = `${locale}|${key}`;
  if (!fmt.has(k))
    fmt.set(k, new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }));
  return fmt.get(k)!;
}

export function formatListingDate(isoDate: string, locale: string): string {
  return formatter(
    locale,
    { year: 'numeric', month: 'short', day: 'numeric' },
    'day',
  ).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

export function groupLabel(
  key: string,
  group: ListingGroup,
  locale: string,
): string {
  if (group.by === 'year' || group.by === 'month' || group.by === 'day') {
    if (!key) return 'Undated';
    if (group.by === 'year') return key;
    if (group.by === 'month')
      return formatter(
        locale,
        { year: 'numeric', month: 'long' },
        'month',
      ).format(new Date(`${key}-01T00:00:00Z`));
    return formatListingDate(key, locale);
  }
  if (!key) return 'Other';
  return group.by === 'folder' ? entryTitleFromPath(key) : key;
}

/** A post page date in long form ("September 18, 2026") in the page/site locale. */
export function formatLongDate(isoDate: string, locale: string): string {
  return formatter(
    locale,
    { year: 'numeric', month: 'long', day: 'numeric' },
    'long',
  ).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}
