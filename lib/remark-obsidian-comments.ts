import { visit, SKIP } from "unist-util-visit";
import type { Root, Text } from "mdast";

/**
 * Remark plugin to remove Obsidian-style comments from markdown.
 * Comments are text wrapped in double percent signs: %%comment%%
 *
 * Examples:
 * - "This is visible %%this is hidden%% text" -> "This is visible  text"
 * - "%%hidden%% visible %%also hidden%%" -> " visible "
 */
function remarkObsidianComments() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (typeof node.value !== "string" || !parent || index === undefined) {
        return;
      }

      // Check if the text contains any %% markers
      if (!node.value.includes("%%")) {
        return;
      }

      // Remove all content between %% markers
      const cleaned = node.value.replace(/%%[\s\S]*?%%/g, "");

      // If the content changed
      if (cleaned !== node.value) {
        // If the cleaned text is empty or only whitespace, remove the node
        if (cleaned.trim() === "") {
          parent.children.splice(index, 1);
          // Return [SKIP, index] to avoid visiting the removed node
          return [SKIP, index];
        }
        // Otherwise, update the node value
        node.value = cleaned;
      }
    });
  };
}

export default remarkObsidianComments;
