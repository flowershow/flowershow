import { matchInlineTags, tagToHref } from '@flowershow/core';
import type { Link, Root, Text } from 'mdast';
import { visit } from 'unist-util-visit';

// Turns inline body `#tags` into pill links pointing at their Tag Page. Runs on
// mdast text nodes only, so `#` inside inline code / fenced code (which parse to
// `inlineCode`/`code` nodes, not `text`) is never touched — mirroring the
// worker's code-stripped extraction. Tag grammar lives in @flowershow/core so
// rendering and extraction can't drift.
//
// A `#tag` whose text node sits inside an existing link is left as plain text to
// avoid producing an invalid nested `<a>`.
function remarkTags() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (
        parent == null ||
        index == null ||
        parent.type === 'link' ||
        parent.type === 'linkReference'
      ) {
        return;
      }

      const matches = matchInlineTags(node.value);
      if (matches.length === 0) return;

      const replacement: Array<Text | Link> = [];
      let cursor = 0;

      for (const { tag, index: at, length } of matches) {
        if (at > cursor) {
          replacement.push({
            type: 'text',
            value: node.value.slice(cursor, at),
          });
        }

        const pill: Link = {
          type: 'link',
          url: tagToHref(tag),
          children: [{ type: 'text', value: `#${tag}` }],
          data: {
            hProperties: { className: ['tag-pill'], 'data-tag': tag },
          },
        };
        replacement.push(pill);
        cursor = at + length;
      }

      if (cursor < node.value.length) {
        replacement.push({ type: 'text', value: node.value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...replacement);
      // Skip the nodes we just inserted so tags aren't re-scanned.
      return index + replacement.length;
    });
  };
}

export default remarkTags;
