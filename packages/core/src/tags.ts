// Shared source of truth for Obsidian-style tags. Imported by the Cloudflare
// worker (extraction at publish time), the render pipeline (pills), the Bases
// plugin (hasTag/tags), and the /tags navigation queries — so "what is a tag"
// and "are two tags equal" can never disagree across those consumers.
//
// Tags come from two places, treated identically:
//   - Frontmatter: `tags:`/`tag:` (YAML list, single string, or CSV/space-list)
//   - Inline body: `#tag`, following Obsidian grammar.
// A page's tag set is the union of both, de-duplicated by case-folded identity,
// preserving the first-seen display casing. See ADR-0012.

export type TagSource = 'frontmatter' | 'inline';

export interface TagWithSource {
  /** Display casing (first-seen), leading `#` stripped. */
  tag: string;
  source: TagSource;
}

/**
 * Case-folded identity of a tag. Two tags are "the same" if their identities
 * are equal, so `#Book` and `#book` collapse. Strips a leading `#` and lowercases.
 */
export function tagIdentity(tag: string): string {
  return String(tag ?? '')
    .trim()
    .replace(/^#/, '')
    .toLowerCase();
}

/** Display form of a tag: trimmed, leading `#` stripped (casing preserved). */
function tagDisplay(tag: string): string {
  return String(tag ?? '')
    .trim()
    .replace(/^#/, '');
}

/**
 * Normalizes a frontmatter `tags`/`tag` value into a clean list of tag strings.
 * Accepts a YAML list (`[a, b]`), a single string, or a whitespace/comma
 * separated string, and strips any leading `#`. Frontmatter is permissive (it
 * does not apply the inline `#tag` grammar) so that Bases-style declarations
 * keep working.
 */
export function normalizeFrontmatterTags(raw: unknown): string[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(/[\s,]+/);
  return arr.map((t) => tagDisplay(String(t))).filter((t) => t.length > 0);
}

/** Reads and normalizes frontmatter tags from a metadata object (`tags` or `tag`). */
export function frontmatterTags(
  metadata: Record<string, unknown> | null | undefined,
): string[] {
  if (!metadata) return [];
  return normalizeFrontmatterTags(metadata.tags ?? metadata.tag);
}

// A single tag token: one or more `/`-separated segments of [A-Za-z0-9_-].
// Must be preceded by start-of-line or whitespace (so URL fragments like
// `x/#anchor`, mid-word hex colors like `abc#fff`, and markdown headings
// `# Heading` — a space isn't a tag char — are never matched).
const INLINE_TAG_PATTERN = /(?<=^|\s)#([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)/g;

/**
 * True if a tag token is a valid inline tag: it must contain at least one
 * non-numeric character, so `#1`/`#123`/`#1/2` are not tags (issue references,
 * numbered notes) but `#book`, `#book/fiction`, and `#2024-review` are.
 */
export function isValidInlineTag(tag: string): boolean {
  return /[A-Za-z_-]/.test(tag);
}

/**
 * Strips fenced code blocks and inline code from markdown so `#` inside code is
 * never treated as a tag. Mirrors the worker's link-extraction code stripping.
 */
function stripCode(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

/**
 * A single inline-tag match within a string: the display tag plus its position,
 * used by the render pipeline to split a text node into text + pill nodes.
 */
export interface InlineTagMatch {
  /** Display tag, leading `#` stripped. */
  tag: string;
  /** Index of the `#` in the input string. */
  index: number;
  /** Length of the full match including the `#`. */
  length: number;
}

/**
 * Finds every inline `#tag` in a plain string (no code stripping — callers that
 * work off a markdown AST already skip code nodes). Used by the remark plugin.
 */
export function matchInlineTags(text: string): InlineTagMatch[] {
  const matches: InlineTagMatch[] = [];
  for (const m of text.matchAll(INLINE_TAG_PATTERN)) {
    const raw = m[1];
    if (raw === undefined || m.index === undefined) continue;
    if (!isValidInlineTag(raw)) continue;
    matches.push({
      tag: raw,
      index: m.index,
      length: m[0].length,
    });
  }
  return matches;
}

/**
 * Extracts all inline `#tags` from a markdown string (frontmatter should be
 * removed by the caller). Strips code first. Used by the worker at publish time.
 */
export function extractInlineTags(markdown: string): string[] {
  return matchInlineTags(stripCode(markdown)).map((m) => m.tag);
}

/**
 * Merges frontmatter and inline tags into a page's canonical tag set: the union
 * de-duplicated by case-folded identity, preserving the first-seen display
 * casing and recording the source (frontmatter wins over inline on a tie).
 */
export function mergePageTags(
  frontmatter: string[],
  inline: string[],
): TagWithSource[] {
  const seen = new Map<string, TagWithSource>();
  const add = (raw: string, source: TagSource) => {
    const id = tagIdentity(raw);
    if (!id) return;
    if (!seen.has(id)) seen.set(id, { tag: tagDisplay(raw), source });
  };
  for (const t of frontmatter) add(t, 'frontmatter');
  for (const t of inline) add(t, 'inline');
  return [...seen.values()];
}

/**
 * Convenience: the page's tag set as display strings (union, deduped by
 * identity, first-seen casing).
 */
export function mergeTags(frontmatter: string[], inline: string[]): string[] {
  return mergePageTags(frontmatter, inline).map((t) => t.tag);
}

/**
 * True if `query` matches any tag in `tags`, including nested descendants.
 * Following Obsidian semantics, `hasTag("book")` matches `book` and
 * `book/fiction`. Case-insensitive (compares by identity).
 */
export function tagMatches(tags: string[], query: string): boolean {
  const q = tagIdentity(query);
  if (!q) return false;
  return tags.some((t) => {
    const id = tagIdentity(t);
    return id === q || id.startsWith(q + '/');
  });
}

/** Builds the href for a tag page, encoding each nested segment. */
export function tagToHref(tag: string): string {
  const segments = tagDisplay(tag)
    .split('/')
    .filter((s) => s.length > 0)
    .map((s) => encodeURIComponent(s));
  return `/tags/${segments.join('/')}`;
}

/**
 * Inverse of `tagToHref`'s encoding: turns the `{tag}` portion of a `/tags/{tag}`
 * URL back into the tag's display value. `decodeURIComponent` reverses the
 * per-segment encoding (path `/` separators are left untouched by both sides),
 * so this round-trips with `tagToHref`. Falls back to the raw segment on
 * malformed percent-encoding rather than throwing.
 */
export function tagFromHref(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
