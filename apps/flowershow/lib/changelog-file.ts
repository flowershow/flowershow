import matter from 'gray-matter';
import type { Heading, Root, RootContent } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

export type ParsedHeading = {
  version?: string;
  date?: string;
  title?: string;
  unreleased: boolean;
};

export type ChangelogSection = {
  heading: Heading;
  parsed: ParsedHeading;
  nodes: RootContent[];
};

const DATE = '(\\d{4}-\\d{2}-\\d{2})';
const DASH = '[-–—]';
const KEEP_A_CHANGELOG_RE = new RegExp(`^(.+?) ${DASH} ${DATE}$`);
const CONVENTIONAL_RE = new RegExp(`^(.+?) \\(${DATE}\\)$`);
const DATE_ONLY_RE = new RegExp(`^${DATE}(?:\\s*(?:${DASH}|:)\\s*(.+))?$`);
const VERSION_RE =
  /^(?:@?[\w.-]+(?:\/[\w.-]+)?@)?v?\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.+-]+)?$/;

/** Plain text of a heading: link text kept, inline HTML (e.g. <small>) dropped. */
export function headingText(node: { children?: unknown[] }): string {
  const walk = (n: any): string => {
    if (n.type === 'html') return '';
    if (typeof n.value === 'string') return n.value;
    return Array.isArray(n.children) ? n.children.map(walk).join('') : '';
  };
  return walk(node).replace(/\s+/g, ' ').trim();
}

export function parseVersionHeading(raw: string): ParsedHeading {
  // `[1.0.0]` without a matching definition stays literal text: drop the brackets
  const text = raw.replace(/^\[([^\]]+)\]/, '$1').trim();
  if (/^unreleased$/i.test(text)) return { unreleased: true };
  let m = text.match(KEEP_A_CHANGELOG_RE) ?? text.match(CONVENTIONAL_RE);
  if (m) return { version: m[1]!.trim(), date: m[2], unreleased: false };
  m = text.match(DATE_ONLY_RE);
  if (m)
    return {
      date: m[1],
      ...(m[2] ? { title: m[2].trim() } : {}),
      unreleased: false,
    };
  if (VERSION_RE.test(text)) return { version: text, unreleased: false };
  return { title: text, unreleased: false };
}

export function isVersionHeading(
  depth: number,
  parsed: ParsedHeading,
): boolean {
  if (depth === 2) return true;
  if (depth === 1) {
    return (
      parsed.unreleased ||
      !!parsed.date ||
      (!!parsed.version && VERSION_RE.test(parsed.version))
    );
  }
  return false;
}

export function splitChangelogTree(tree: Root): {
  titleNode?: Heading;
  preamble: RootContent[];
  sections: ChangelogSection[];
} {
  let titleNode: Heading | undefined;
  const preamble: RootContent[] = [];
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | undefined;

  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth <= 2) {
      const parsed = parseVersionHeading(headingText(node));
      if (isVersionHeading(node.depth, parsed)) {
        current = { heading: node, parsed, nodes: [] };
        sections.push(current);
        continue;
      }
      if (node.depth === 1 && !titleNode && !current) {
        titleNode = node;
        continue;
      }
    }
    (current ? current.nodes : preamble).push(node);
  }
  return { titleNode, preamble, sections };
}

export function entryAnchor(parsed: ParsedHeading, used: Set<string>): string {
  const raw = parsed.unreleased
    ? 'unreleased'
    : (parsed.version ?? parsed.date ?? parsed.title ?? 'entry');
  const base =
    raw
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '') || 'entry';
  let anchor = base;
  for (let i = 1; used.has(anchor); i++) anchor = `${base}-${i}`;
  used.add(anchor);
  return anchor;
}

/**
 * Whether a markdown source has at least one version heading, i.e. whether
 * `remarkChangelog` would restructure it. Files without any render as normal pages.
 */
export function hasVersionSections(source: string): boolean {
  const { content } = matter(source);
  const tree = unified().use(remarkParse).parse(content);
  return splitChangelogTree(tree).sections.length > 0;
}
