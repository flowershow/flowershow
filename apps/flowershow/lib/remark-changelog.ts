import type {
  Definition,
  Heading,
  Link,
  PhrasingContent,
  Root,
  RootContent,
} from 'mdast';
import { formatChangelogDate } from '@/lib/changelog';
import {
  type ChangelogSection,
  entryAnchor,
  splitChangelogTree,
} from '@/lib/changelog-file';

type Props = Record<string, unknown>;

/** A generic mdast node that remark-rehype turns into <tagName ...props>. */
function el(
  tagName: string,
  className: string[],
  children: unknown[],
  props: Props = {},
): RootContent {
  return {
    type: 'changelogElement',
    data: {
      hName: tagName,
      hProperties: { ...(className.length ? { className } : {}), ...props },
    },
    children,
  } as unknown as RootContent;
}

const text = (value: string): PhrasingContent => ({ type: 'text', value });

function entryTitle(section: ChangelogSection): string {
  const p = section.parsed;
  if (p.unreleased) return 'Unreleased';
  return p.version ?? p.title ?? (p.date ? formatChangelogDate(p.date) : '');
}

/**
 * The URL a version heading links to: release-please's inline
 * `[1.2.0](…/compare/…)` or Keep a Changelog's `[1.2.0]` reference.
 */
function headingLinkUrl(
  heading: Heading,
  definitions: Map<string, string>,
): string | undefined {
  for (const child of heading.children) {
    if (child.type === 'link') return child.url;
    if (child.type === 'linkReference') {
      return definitions.get(child.identifier.toLowerCase());
    }
  }
  return undefined;
}

/** A plain mdast link, so it gets the same URL handling as any other link. */
function compareLink(url: string): Link {
  return {
    type: 'link',
    url,
    children: [text(url.includes('/compare/') ? 'Compare' : 'Release')],
    data: { hProperties: { className: ['changelog-entry-compare'] } },
  };
}

function isEmpty(nodes: RootContent[]): boolean {
  return nodes.every((n) => n.type === 'definition');
}

/**
 * Turn a single-file changelog (Keep a Changelog, Changesets, release-please,
 * date-only) into the same `.changelog-*` DOM as the folder changelog.
 * Rewrites the whole tree once so reference definitions keep resolving.
 */
export default function remarkChangelog(options: { title?: string } = {}) {
  return (tree: Root) => {
    const { titleNode, preamble, sections } = splitChangelogTree(tree);
    if (sections.length === 0) return;

    const definitions = new Map<string, string>();
    for (const node of tree.children) {
      if (node.type === 'definition') {
        const def = node as Definition;
        definitions.set(def.identifier.toLowerCase(), def.url);
      }
    }

    const used = new Set<string>();
    const entries: RootContent[] = [];
    // Definitions inside skipped (empty Unreleased) sections must stay in the tree.
    const orphanDefinitions: RootContent[] = [];

    for (const section of sections) {
      if (section.parsed.unreleased && isEmpty(section.nodes)) {
        orphanDefinitions.push(...section.nodes);
        continue;
      }
      const anchor = entryAnchor(section.parsed, used);
      const date = section.parsed.date;
      const linkUrl = headingLinkUrl(section.heading, definitions);
      entries.push(
        el(
          'li',
          [
            'changelog-entry',
            ...(section.parsed.unreleased ? ['is-unreleased'] : []),
          ],
          [
            el(
              'div',
              ['changelog-entry-meta'],
              [
                el(
                  'div',
                  ['changelog-entry-meta-inner'],
                  [
                    ...(date
                      ? [
                          el(
                            'a',
                            ['changelog-entry-date'],
                            [
                              el(
                                'time',
                                [],
                                [text(formatChangelogDate(date))],
                                { dateTime: date },
                              ),
                            ],
                            { href: `#${anchor}` },
                          ),
                        ]
                      : []),
                    ...(linkUrl ? [compareLink(linkUrl)] : []),
                  ],
                ),
              ],
            ),
            el(
              'div',
              ['changelog-entry-content'],
              [
                el(
                  'h2',
                  ['changelog-entry-title'],
                  [
                    {
                      type: 'link',
                      url: `#${anchor}`,
                      children: [text(entryTitle(section))],
                    },
                  ],
                ),
                el(
                  'div',
                  ['changelog-entry-body', 'rendered-mdx'],
                  section.nodes,
                ),
              ],
            ),
          ],
          { id: anchor },
        ),
      );
    }

    const titleChildren = titleNode
      ? titleNode.children
      : [text(options.title || 'Changelog')];

    tree.children = [
      el(
        'div',
        ['changelog'],
        [
          el(
            'header',
            ['changelog-header'],
            [
              el(
                'div',
                [],
                [
                  el('h1', ['changelog-title'], titleChildren),
                  ...(preamble.length
                    ? [el('div', ['changelog-intro', 'rendered-mdx'], preamble)]
                    : []),
                ],
              ),
            ],
          ),
          el('ol', ['changelog-entries'], entries),
        ],
      ),
      ...orphanDefinitions,
    ];
  };
}
