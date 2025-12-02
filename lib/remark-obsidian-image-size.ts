import { visit } from "unist-util-visit";
import type { Root, Image } from "mdast";

/**
 * Remark plugin to add support for Obsidian-style image resizing.
 *
 * Obsidian allows specifying image dimensions in the alt text:
 * - ![250x100](image.jpg) - sets width to 250px and height to 100px
 * - ![250](image.jpg) - sets width to 250px (height auto)
 *
 * This plugin detects these patterns and converts them to proper image attributes
 * while preserving the original alt text if it's not just dimensions.
 *
 * Examples:
 * - ![250x100](image.jpg) -> <img width="250" height="100" alt="" src="image.jpg" />
 * - ![250](image.jpg) -> <img width="250" alt="" src="image.jpg" />
 * - ![My image 250x100](image.jpg) -> alt text is preserved as "My image 250x100"
 */
function remarkObsidianImageSize() {
  return (tree: Root) => {
    visit(tree, "image", (node: Image) => {
      if (!node.alt) {
        return;
      }

      // Check if alt text is ONLY dimensions (widthxheight or just width)
      // Pattern: optional whitespace, digits, optional 'x' followed by digits, optional whitespace
      const dimensionOnlyPattern = /^\s*(\d+)(?:x(\d+))?\s*$/;
      const match = node.alt.match(dimensionOnlyPattern);

      if (match) {
        const width = match[1];
        const height = match[2];

        // Add data attributes that will be converted to HTML attributes
        // Using the data property which is part of the mdast spec
        if (!node.data) {
          node.data = {};
        }
        if (!node.data.hProperties) {
          node.data.hProperties = {};
        }

        // Set width (always present if pattern matches)
        node.data.hProperties.width = width;

        // Set height if provided (widthxheight format)
        if (height) {
          node.data.hProperties.height = height;
        }

        // Add inline styles to prevent CSS overrides
        const styleValue = height
          ? `width: ${width}px; height: ${height}px;`
          : `width: ${width}px;`;
        node.data.hProperties.style = styleValue;

        // Clear the alt text since it was only dimensions
        node.alt = "";
      }
      // If alt text contains other content besides dimensions, leave it as-is
      // This preserves meaningful alt text like "My image 250x100"
    });
  };
}

export default remarkObsidianImageSize;
