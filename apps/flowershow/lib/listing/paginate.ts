import { parsePageParam } from '@/lib/changelog';
import type { ListingSpec } from './spec';

export type ListingPage<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  paginated: boolean;
};

export function sliceListing<T>(
  items: T[],
  spec: Pick<ListingSpec, 'limit' | 'pageSize'>,
  page: number,
): ListingPage<T> {
  if (spec.limit != null)
    return {
      items: items.slice(0, spec.limit),
      page: 1,
      pageCount: 1,
      total: items.length,
      paginated: false,
    };
  if (spec.pageSize == null)
    return {
      items,
      page: 1,
      pageCount: 1,
      total: items.length,
      paginated: false,
    };
  const pageCount = Math.max(1, Math.ceil(items.length / spec.pageSize));
  const p =
    Number.isSafeInteger(page) && page >= 1
      ? page
      : page >= 1
        ? pageCount + 1
        : 1;
  const start = (p - 1) * spec.pageSize;
  return {
    items: items.slice(start, start + spec.pageSize),
    page: p,
    pageCount,
    total: items.length,
    paginated: true,
  };
}

export function pageFromSearchParam(
  value: string | string[] | undefined,
): number {
  return parsePageParam(value) ?? 1;
}

export function pageHref(publicUrl: string, page: number): string {
  const base = publicUrl.split(/[?#]/)[0] || '/';
  return page <= 1 ? base : `${base}?page=${page}`;
}

/** `generateMetadata` cannot see inline blocks, so only page-level listings (layout: list, zero-config) get a self-canonical. */
export function listingCanonical(
  url: string,
  pageLevel: boolean,
  pageParam: string | string[] | undefined,
): string {
  const page = pageLevel ? pageFromSearchParam(pageParam) : 1;
  return page > 1 ? pageHref(url, page) : url;
}
