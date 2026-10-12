import type { Root, RootContent } from 'mdast';
import type { ReactElement } from 'react';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import ListingImage from '@/components/public/mdx/listing-image';
import type { ResolvedAuthor } from '@/lib/listing/authors';
import type { ListingItem } from '@/lib/listing/items';
import { renderListing } from '@/lib/listing/render';
import type { ListingSpec } from '@/lib/listing/spec';
import { remarkMdxJsxToElement } from '@/lib/markdown';
import rehypeListingHeadings from '@/lib/rehype-listing-headings';
import rehypeToReact from '@/lib/rehype-to-react';

/** Listing nodes (lib/listing/render.ts) to React, with the same image component and heading rules as both pipelines. */
export async function listingNodesToReact(
  nodes: RootContent[],
): Promise<ReactElement> {
  const processor = unified()
    .use(remarkMdxJsxToElement)
    .use(remarkRehype)
    .use(rehypeListingHeadings)
    .use(rehypeToReact, { components: { listingimage: ListingImage } });
  const tree: Root = { type: 'root', children: nodes };
  const hast = await processor.run(tree as never);
  return processor.stringify(hast as never) as unknown as ReactElement;
}

/** The read-more cards: exactly the listing grid cards, three at most, no pagination. */
export async function renderReadMoreCards({
  items,
  spec,
  authors,
  locale,
}: {
  items: ListingItem[];
  spec: ListingSpec;
  authors: Map<string, ResolvedAuthor>;
  locale: string;
}): Promise<ReactElement | null> {
  if (items.length === 0) return null;
  const node = renderListing({
    spec,
    page: {
      items,
      page: 1,
      pageCount: 1,
      total: items.length,
      paginated: false,
    },
    authors,
    publicUrl: '/',
    locale,
  });
  return listingNodesToReact([node]);
}
