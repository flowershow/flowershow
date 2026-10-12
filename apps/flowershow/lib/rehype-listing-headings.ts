import { visit } from 'unist-util-visit';
import {
  LISTING_GROUP_HEADING_CLASS,
  LISTING_HEADING_PLACEHOLDER_ID,
  LISTING_HEADLINE_CLASS,
  LISTING_SECTION_HEADING_CLASS,
} from './listing/render';

/** Runs after rehype-slug: listing item headings get no id, so no anchor, no slug collisions. */
export default function rehypeListingHeadings() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      const cls = node.properties?.className;
      // item titles, group and section headings share the placeholder id
      if (
        Array.isArray(cls) &&
        (cls.includes(LISTING_HEADLINE_CLASS) ||
          cls.includes(LISTING_GROUP_HEADING_CLASS) ||
          cls.includes(LISTING_SECTION_HEADING_CLASS)) &&
        node.properties.id === LISTING_HEADING_PLACEHOLDER_ID
      )
        delete node.properties.id;
    });
  };
}
