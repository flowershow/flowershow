import { tagToHref } from '@flowershow/core';
import Link from 'next/link';
import { api } from '@/trpc/server';

/**
 * The `/tags` index: every tag on the site with a page count. A virtual Tag
 * Page rendered as a fallback in the public catch-all route (real content at
 * `/tags` always wins). See ADR-0012.
 *
 * These are generated navigation pages, not rendered Markdown — they use their
 * own `tags-page` markup and deliberately avoid the content layout / the
 * `rendered-mdx` class, which are reserved for Markdown-rendered content.
 */
export async function TagIndexPage({ siteId }: { siteId: string }) {
  const tags = await api.site.getTagIndex.query({ siteId });

  return (
    <div className="tags-page">
      <header className="tags-page-header">
        <h1 className="tags-page-title">Tags</h1>
      </header>
      {tags.length === 0 ? (
        <p className="tags-page-empty">No tags yet.</p>
      ) : (
        <ul className="tag-index">
          {tags.map((t) => (
            <li key={t.tag} className="tag-index-item">
              <Link href={tagToHref(t.tag)} className="tag-pill">
                #{t.tag}
              </Link>
              <span className="tag-index-count">{t.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A per-tag page at `/tags/{tag}`: every page carrying that tag, including
 * nested descendants (`book` surfaces `book/fiction`). An empty tag renders a
 * sensible empty state rather than a 404 so stale/mistyped links don't break.
 */
export async function TagListingPage({
  siteId,
  tag,
}: {
  siteId: string;
  tag: string;
}) {
  const pages = await api.site.getPagesByTag.query({ siteId, tag });

  return (
    <div className="tags-page">
      <header className="tags-page-header">
        <h1 className="tags-page-title">#{tag}</h1>
      </header>
      {pages.length === 0 ? (
        <p className="tags-page-empty">No pages with this tag.</p>
      ) : (
        <ol className="tag-page-list">
          {pages.map((p) => (
            <li key={p.href} className="tag-page-list-item">
              <Link href={p.href}>{p.title ?? p.href}</Link>
              {p.description && (
                <p className="tag-page-list-description">{p.description}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
