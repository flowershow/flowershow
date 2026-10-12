import { ListingPage } from './listing-page';

/** Zero-config case 1: same shell as the README-less changelog page (no sidebar, ToC, breadcrumbs or hero). */
export function VirtualListingPage({
  title,
  listing,
  view,
  feedUrl,
}: {
  title: string;
  listing: React.ReactNode;
  view: string;
  feedUrl?: string | null;
}) {
  return (
    <ListingPage
      title={title}
      view={view}
      feedUrl={feedUrl}
      listing={listing}
      hasIntro={false}
    />
  );
}
