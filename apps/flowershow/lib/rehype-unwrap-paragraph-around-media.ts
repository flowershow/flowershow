import type { Element, Parent, Root } from 'hast';
import { visit } from 'unist-util-visit';

function isElement(node: any): node is Element {
  return node && node.type === 'element' && typeof node.tagName === 'string';
}

function isWhitespaceText(node: any) {
  return (
    node?.type === 'text' &&
    typeof node.value === 'string' &&
    node.value.trim() === ''
  );
}

const MEDIA_TAGS = new Set(['img', 'iframe', 'video', 'audio']);

function isSoloMediaOrLinkedMedia(child: any): boolean {
  if (!isElement(child)) return false;

  if (MEDIA_TAGS.has(child.tagName)) return true;

  // <a><img/></a> etc.
  if (child.tagName === 'a' && Array.isArray(child.children)) {
    const meaningful = child.children.filter((c: any) => !isWhitespaceText(c));
    return (
      meaningful.length === 1 &&
      isElement(meaningful[0]) &&
      MEDIA_TAGS.has(meaningful[0].tagName)
    );
  }

  return false;
}

function rehypeUnwrapParagraphsAroundMedia() {
  return function transformer(tree: Root) {
    visit(tree, 'element', (node: Element, index?: number, parent?: Parent) => {
      if (parent == null || index == null) return; // handles undefined

      // target: <p> ... </p>
      if (node.tagName !== 'p' || !Array.isArray(node.children)) return;

      const meaningful = node.children.filter((c: any) => !isWhitespaceText(c));

      if (meaningful.length === 1 && isSoloMediaOrLinkedMedia(meaningful[0])) {
        // Replace <p> with the child (<img>, <iframe>, <a><img/></a>, etc.)
        (parent.children as any[])[index] = meaningful[0];
      }
    });
  };
}

export default rehypeUnwrapParagraphsAroundMedia;
