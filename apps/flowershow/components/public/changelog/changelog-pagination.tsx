import Link from 'next/link';

interface Props {
  baseUrl: string;
  page: number;
  pageCount: number;
  shown: number;
  total: number;
}

export function ChangelogPagination({
  baseUrl,
  page,
  pageCount,
  total,
}: Props) {
  if (pageCount <= 1) return null;
  const href = (p: number) => (p === 1 ? baseUrl : `${baseUrl}?page=${p}`);
  return (
    <nav className="changelog-pagination" aria-label="Changelog pages">
      <div className="changelog-pagination-inner">
        {page > 1 ? (
          <Link href={href(page - 1)}>← Newer updates</Link>
        ) : (
          <span />
        )}
        <span className="changelog-pagination-count">{`Page ${page} of ${pageCount} · ${total} updates`}</span>
        {page < pageCount ? (
          <Link href={href(page + 1)}>Older updates →</Link>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
