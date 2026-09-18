import { neighbours } from '@/lib/changelog';
import { ensureLeadingSlash } from '@/lib/utils';
import { api } from '@/trpc/server';
import { ChangelogEntry } from './changelog-entry';
import { ChangelogEntryNav } from './changelog-entry-nav';
import type { ChangelogAuthor } from './types';

interface Props extends React.PropsWithChildren {
  siteId: string;
  dir: string;
  blobPath: string;
  authors?: ChangelogAuthor[];
}

/** A single changelog entry page: entry layout plus previous/next navigation. */
export async function ChangelogEntryPage({
  siteId,
  dir,
  blobPath,
  authors,
  children,
}: Props) {
  const { entries } = await api.site.getChangelogEntries.query({
    siteId,
    dir,
  });
  const entry = entries.find((e) => e.path === blobPath);
  // e.g. the entry was excluded from the listing: fall back to the plain body
  if (!entry) return <>{children}</>;
  const { newer, older } = neighbours(entries, blobPath);
  return (
    <>
      <ChangelogEntry
        entry={entry}
        authors={authors ?? []}
        variant="page"
        indexUrl={ensureLeadingSlash(dir)}
      >
        {children}
      </ChangelogEntry>
      <ChangelogEntryNav newer={newer} older={older} />
    </>
  );
}
