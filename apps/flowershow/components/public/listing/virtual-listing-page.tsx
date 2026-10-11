import { BlogLayout } from '@/components/public/layouts/blog';

/** Zero-config case 1: same shell as the README-less changelog page (no sidebar, ToC, breadcrumbs or hero). */
export function VirtualListingPage({
  title,
  listing,
  view,
}: {
  title: string;
  listing: React.ReactNode;
  view: string;
}) {
  return (
    <div className="listing-page" data-view={view}>
      <BlogLayout title={title}>
        <div className="rendered-mdx" id="mdxpage">
          {listing}
        </div>
      </BlogLayout>
    </div>
  );
}
