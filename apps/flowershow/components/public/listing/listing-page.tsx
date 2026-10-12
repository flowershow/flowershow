import { RssIcon } from 'lucide-react';
import type React from 'react';
import { BlogLayout } from '@/components/public/layouts/blog';

type BlogLayoutProps = React.ComponentProps<typeof BlogLayout>;

/**
 * A page-level listing (`layout: list`, a zero-config blog/posts page): the
 * header (title, description, feed link), the page's own intro directly under
 * it, then a rule and the listing. `.listing-page[data-view]` sets the column
 * (default-theme.css). `children` follow the content (e.g. CanvasEnhancer).
 */
export function ListingPage({
  view,
  feedUrl,
  intro,
  hasIntro = true,
  listing,
  children,
  ...layout
}: Omit<BlogLayoutProps, 'actions'> & {
  view: string;
  /** The site's feed, when it has one for this listing (see listingFeedUrl). */
  feedUrl?: string | null;
  /** The page body above the listing (its page scripts too, so always passed). */
  intro?: React.ReactNode;
  /** The body has text: give the intro its slot under the header. */
  hasIntro?: boolean;
  listing: React.ReactNode;
}) {
  return (
    <div className="listing-page" data-view={view}>
      <BlogLayout
        {...layout}
        actions={feedUrl ? <ListingFeedLink href={feedUrl} /> : undefined}
      >
        <div className="rendered-mdx" id="mdxpage">
          {hasIntro ? <div className="listing-page-intro">{intro}</div> : intro}
          <div className="listing-page-listing">{listing}</div>
        </div>
        {children}
      </BlogLayout>
    </div>
  );
}

function ListingFeedLink({ href }: { href: string }) {
  return (
    <a
      className="listing-page-feed-link"
      href={href}
      type="application/rss+xml"
      title="RSS feed"
      aria-label="RSS feed"
    >
      <RssIcon className="listing-page-feed-icon" aria-hidden="true" />
      <span className="listing-page-feed-label">RSS</span>
    </a>
  );
}
