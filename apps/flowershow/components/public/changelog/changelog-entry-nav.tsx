import Link from 'next/link';
import type { ChangelogEntryMeta } from '@/lib/changelog';

export function ChangelogEntryNav({
  newer,
  older,
}: {
  newer: ChangelogEntryMeta | null;
  older: ChangelogEntryMeta | null;
}) {
  if (!newer && !older) return null;
  return (
    <nav className="changelog-entry-nav" aria-label="More updates">
      {older ? (
        <Link className="changelog-entry-nav-older" href={older.url}>
          <small>← Previous</small>
          <span>{older.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {newer ? (
        <Link className="changelog-entry-nav-newer" href={newer.url}>
          <small>Next →</small>
          <span>{newer.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
