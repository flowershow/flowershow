import type { AnnotationSelector } from '@flowershow/api-contract';
import { ANNOTATION_LIMITS } from './limits';
import { matchQuote, textMatchScore } from './match-quote';

/** Characters of context stored before and after the quote (W3C/Hypothesis convention). */
export const CONTEXT_LENGTH = 32;
/** Longest quote we store; longer selections are clamped. Mirrors the API contract via ./limits. */
export const QUOTE_MAX = ANNOTATION_LIMITS.quote;
/** Quotes longer than this are only matched verbatim: fuzzy search on them is slow and rarely right. */
export const FUZZY_MAX_QUOTE = 256;
/** A fuzzy match must be at least this similar to the stored quote, or the note is outdated. */
export const MIN_QUOTE_SIMILARITY = 0.8;

export type TextAnchor = { start: number; end: number };
export type DescribedSelection = {
  selector: AnnotationSelector;
  truncated: boolean;
};

/** Text of every Text node under `root`, in document order. Offsets index into this. */
export function getRootText(root: Element): string {
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );
  let text = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    text += (node as Text).data;
  }
  return text;
}

/** Offset in getRootText(root) of a DOM boundary point (element containers too). */
export function textOffsetAt(
  root: Element,
  node: Node,
  offset: number,
): number {
  const range = root.ownerDocument.createRange();
  range.setStart(root, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

/**
 * TextQuote + TextPosition selector for a selection, clamped to `root` (a
 * selection that runs into the title or footer keeps its body part), with
 * surrounding whitespace trimmed and the quote clamped to QUOTE_MAX. Null if
 * nothing of it is inside `root` or it is only whitespace.
 */
export function describeRange(
  root: Element,
  range: Range,
): DescribedSelection | null {
  if (range.collapsed || !range.intersectsNode(root)) return null;
  const clamped = range.cloneRange();
  if (!root.contains(clamped.startContainer)) clamped.setStart(root, 0);
  if (!root.contains(clamped.endContainer)) {
    clamped.setEnd(root, root.childNodes.length);
  }
  const text = getRootText(root);
  let start = textOffsetAt(root, clamped.startContainer, clamped.startOffset);
  let end = textOffsetAt(root, clamped.endContainer, clamped.endOffset);
  while (start < end && /\s/.test(text.charAt(start))) start++;
  while (end > start && /\s/.test(text.charAt(end - 1))) end--;
  if (start >= end) return null;
  const truncated = end - start > QUOTE_MAX;
  if (truncated) end = start + QUOTE_MAX;
  return {
    selector: {
      exact: text.slice(start, end),
      prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
      suffix: text.slice(end, end + CONTEXT_LENGTH),
      start,
      end,
    },
    truncated,
  };
}

/** DOM Range for [start, end) in getRootText(root), or null if out of bounds. */
export function rangeFromOffsets(
  root: Element,
  start: number,
  end: number,
): Range | null {
  if (end <= start) return null;
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = doc.createRange();
  let position = 0;
  let startSet = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = (node as Text).data.length;
    if (!startSet && start < position + length) {
      range.setStart(node, start - position);
      startSet = true;
    }
    if (startSet && end <= position + length) {
      range.setEnd(node, end - position);
      return range;
    }
    position += length;
  }
  return null;
}

/**
 * Where `selector` sits in `text` now: the stored position if quote and context
 * still match there, else the best match (Hypothesis scoring). Null means the
 * quote is gone or changed too much: the annotation is outdated.
 */
export function anchorSelector(
  text: string,
  selector: AnnotationSelector,
): TextAnchor | null {
  const { exact, prefix, suffix, start, end } = selector;
  if (
    text.slice(start, end) === exact &&
    text.slice(Math.max(0, start - prefix.length), start) === prefix &&
    text.slice(end, end + suffix.length) === suffix
  ) {
    return { start, end };
  }
  if (exact.length > FUZZY_MAX_QUOTE && !text.includes(exact)) return null;
  const match = matchQuote(text, exact, { prefix, suffix, hint: start });
  if (!match) return null;
  if (
    textMatchScore(text.slice(match.start, match.end), exact) <
    MIN_QUOTE_SIMILARITY
  ) {
    return null;
  }
  return { start: match.start, end: match.end };
}
