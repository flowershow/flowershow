import { notFound } from 'next/navigation';
import { CHANGELOG_PAGE_SIZE, paginate } from '@/lib/changelog';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import { renderPageContent } from '@/lib/render-page-content';
import { ensureLeadingSlash } from '@/lib/utils';
import type { SiteLookupResult } from '@/server/api/types';
import { api } from '@/trpc/server';
import { ChangelogEntry } from './changelog-entry';
import { ChangelogIndex } from './changelog-index';
import { ChangelogPagination } from './changelog-pagination';
import type { ChangelogAuthor } from './types';

interface Props {
  site: SiteLookupResult;
  dir: string;
  page: number;
  title: string;
  intro?: React.ReactNode;
  renderMode: string | undefined;
  siteHostname: string;
  siteFilePaths: string[];
  permalinksMapping: Record<string, string>;
  imageDimensions: ImageDimensionsMap;
}

/** Full-entry changelog timeline for a folder: fetches, compiles and renders one page of entries. */
export async function ChangelogIndexPage(props: Props) {
  const { entries } = await api.site.getChangelogEntries.query({
    siteId: props.site.id,
    dir: props.dir,
  });
  const pageData = paginate(entries, props.page, CHANGELOG_PAGE_SIZE);
  if (!pageData) notFound();

  // One batched author lookup for the whole page; getAuthors preserves input order.
  const handles = [...new Set(pageData.items.flatMap((e) => e.authors))];
  const resolved: ChangelogAuthor[] = handles.length
    ? await api.site.getAuthors
        .query({ siteId: props.site.id, authors: handles })
        .catch(() => [])
    : [];
  const byHandle = new Map(
    handles.map((h, i) => [h, resolved[i] ?? { key: h, name: h, url: null }]),
  );

  const bodies = await Promise.all(
    pageData.items.map(async (entry) => {
      const blob = await api.site.getBlobByPath
        .query({ siteId: props.site.id, path: entry.path })
        .catch(() => null);
      if (!blob) return null;
      const content = await api.site.getBlobContent
        .query({ id: blob.id })
        .catch(() => null);
      return renderPageContent({
        blob,
        site: props.site,
        content,
        renderMode:
          (blob.metadata as { syntaxMode?: string } | null)?.syntaxMode ??
          props.renderMode,
        siteHostname: props.siteHostname,
        siteFilePaths: props.siteFilePaths,
        permalinksMapping: props.permalinksMapping,
        imageDimensions: props.imageDimensions,
      });
    }),
  );

  return (
    <ChangelogIndex
      title={props.title}
      intro={props.intro}
      pagination={
        <ChangelogPagination
          baseUrl={ensureLeadingSlash(props.dir)}
          page={pageData.page}
          pageCount={pageData.pageCount}
          shown={pageData.items.length}
          total={pageData.total}
        />
      }
    >
      {pageData.items.map((entry, i) => (
        <ChangelogEntry
          key={entry.id}
          entry={entry}
          variant="index"
          authors={entry.authors
            .map((h) => byHandle.get(h))
            .filter((a): a is ChangelogAuthor => !!a)}
        >
          {bodies[i]}
        </ChangelogEntry>
      ))}
    </ChangelogIndex>
  );
}
