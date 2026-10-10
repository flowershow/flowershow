import { remarkWikiLink } from '@flowershow/remark-wiki-link';
import remarkCallout from '@r4ai/remark-callout';
import matter from 'gray-matter';
import { fromHtml } from 'hast-util-from-html';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { h } from 'hastscript';
import mdxMermaid from 'mdx-mermaid';
import type { EvaluateOptions } from 'next-mdx-remote-client/rsc';
import type { ElementType, ReactElement } from 'react';
import * as runtime from 'react/jsx-runtime';
import rehypeAutolinkHeadings, {
  type Options as RehypeAutolinkHeadingsOptions,
} from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { remarkMark } from 'remark-mark-highlight';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';
import { type Pluggable, type Plugin, unified } from 'unified';
import { visit } from 'unist-util-visit';
import FsImage from '@/components/public/mdx/fs-image';
import { Iframe } from '@/components/public/mdx/iframe';
import {
  Mermaid,
  ObsidianBasesViews,
} from '@/components/public/mdx/mdx-client-components';
import Pre from '@/components/public/mdx/pre';
import remarkObsidianComments from '@/lib/remark-obsidian-comments';
import remarkYouTubeAutoEmbed from '@/lib/remark-youtube-auto-embed';
import type { ImageDimensionsMap } from './image-dimensions';
import rehypeHtmlEnhancements from './rehype-html-enhancements';
import rehypeInjectImageDimensions from './rehype-inject-image-dimensions';
import rehypeJsonCanvas from './rehype-json-canvas';
import rehypeResolveExplicitJsxUrls from './rehype-resolve-explicit-jsx-urls';
import rehypeResolveHtmlUrls from './rehype-resolve-html-urls';
import rehypeToReact from './rehype-to-react';
import rehypeUnwrapParagraphsAroundMedia from './rehype-unwrap-paragraph-around-media';
import rehypeZoomableJsxImages from './rehype-zoomable-jsx-images';
import remarkChangelog, {
  type RemarkChangelogOptions,
} from './remark-changelog';
import remarkCommonMarkLink from './remark-commonmark-link';
import remarkObsidianBases from './remark-obsidian-bases';
import remarkTags from './remark-tags';
import { resolveContentLink } from './resolve-link';

interface MarkdownOptions {
  filePath: string;
  files: string[];
  parseFrontmatter?: boolean;
  siteHostname: string;
  siteId?: string;
  rootDir?: string;
  permalinks?: Record<string, string>;
  imageDimensions?: ImageDimensionsMap;
  canvasFiles?: Record<string, string>;
  canvasNodeFiles?: Record<string, string>;
  /** Render the file as a single-file changelog timeline. */
  changelog?: RemarkChangelogOptions;
  /**
   * Turn inline body `#tags` into pill links. Defaults to on; pass `false`
   * (the site's `showTags` config) to leave `#tags` as plain text.
   */
  showTags?: boolean;
}

// Private Use Area char used as a temporary alias divider so GFM table block-parsing
// (which splits on | before inline tokenization runs) doesn't break [[target|alias]] links.
const WIKI_ALIAS_DIVIDER = '\uE000';

export function protectWikiLinkAliases(content: string): string {
  return content.replace(
    /\[\[([^\[\]\n|]*?)\\?\|([^\[\]\n]*?)\]\]/g,
    `[[$1${WIKI_ALIAS_DIVIDER}$2]]`,
  );
}

// Process pure markdown files using unified
export async function processMarkdown(
  _content: string,
  options: MarkdownOptions,
) {
  const { filePath, files, siteHostname, permalinks } = options;

  // this strips out frontmatter, so that it's not inlined with the rest of the markdown file
  const { content: rawContent } = matter(_content, {});

  // Protect [[target|alias]] from GFM table cell splitting before unified parses,
  // and escape `$` that isn't part of a real math span so dollar signs in prose
  // aren't parsed as inline math (#1359).
  const content = protectNonMathDollars(protectWikiLinkAliases(rawContent));

  const processor = unified()
    .use(remarkParse)
    .use(remarkObsidianComments)
    // run this before remark-wiki-link
    .use(remarkCommonMarkLink, {
      filePath,
      siteHostname,
      permalinks,
    })
    .use(remarkWikiLink, {
      files,
      format: 'shortestPossible',
      urlResolver: getUrlResolver(siteHostname),
      permalinks,
      aliasDivider: WIKI_ALIAS_DIVIDER,
    })
    .use(remarkYouTubeAutoEmbed)
    .use(remarkGfm)
    .use(remarkSmartypants, { quotes: false, dashes: 'oldschool' })
    .use(remarkMath)
    .use(remarkCallout)
    // mdx-mermaid's typings don't match unified's Plugin signature
    .use(mdxMermaid as Plugin<[object?]>, {})
    .use(remarkMark)
    // `showTags === false` disables inline `#tag` pills, leaving them as text.
    .use(options.showTags === false ? () => undefined : remarkTags)
    // ```base blocks need a site to query
    .use(options.siteId ? remarkObsidianBases : () => undefined, {
      siteId: options.siteId!,
      siteHostname,
      rootDir: options.rootDir,
    })
    .use(remarkMdxJsxToElement)
    // Last remark plugin: it restructures the whole tree
    .use(
      options.changelog ? remarkChangelog : () => undefined,
      options.changelog,
    )
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeJsonCanvas, {
      canvasFiles: options.canvasFiles ?? {},
      canvasNodeFiles: options.canvasNodeFiles,
      files,
      siteHostname,
      permalinks,
    })
    .use(rehypeUnwrapParagraphsAroundMedia)
    .use(rehypeResolveHtmlUrls, { filePath, siteHostname })
    .use(rehypeHtmlEnhancements, {})
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, rehypeAutolinkHeadingsConfig)
    .use(rehypeKatex, { output: 'htmlAndMathml' })
    .use(rehypePrismPlus, { ignoreMissing: true })
    .use(rehypeInjectImageDimensions, {
      dimensions: options.imageDimensions ?? {},
    })
    .use(rehypeToReact, {
      // Same as the MDX components, so code blocks get a copy button and
      // ```mermaid blocks render as diagrams in .md pages too.
      components: {
        img: FsImage,
        pre: Pre,
        mermaid: Mermaid,
        iframe: Iframe,
        obsidianbasesviews: ObsidianBasesViews,
      },
    });

  return (await processor.process(content)).result as ReactElement;
}

/**
 * Some remark plugins shared with the MDX pipeline (e.g. remark-obsidian-bases)
 * emit MDX JSX elements, which remark-rehype drops. Turn them into plain hast
 * elements named after the component, with their string attributes as
 * properties, so `components` can map them to React components. The name is
 * lowercased because rehype-raw (HTML parsing) lowercases tag names anyway.
 */
function remarkMdxJsxToElement() {
  return (tree: any) => {
    visit(tree, 'mdxJsxFlowElement', (node: any) => {
      node.data = {
        ...node.data,
        hName: node.name.toLowerCase(),
        hProperties: Object.fromEntries(
          node.attributes
            .filter((attr: any) => typeof attr.value === 'string')
            .map((attr: any) => [attr.name, attr.value]),
        ),
      };
    });
  };
}

// Elements that only make sense in a document `<head>`. React 19 hoists
// `<title>`/`<meta>`/`<link>` rendered anywhere into the page head, and the
// first `<base>` in tree order applies document-wide, so in a fragment that is
// rendered on every page (the footer) they would silently change every page's
// title, description or URL resolution. `<link rel="stylesheet">` and
// `<style>` are kept: they're a legitimate way to style the fragment.
function isHeadOnlyElement(node: any) {
  if (node.type !== 'element') return false;
  if (['title', 'meta', 'base'].includes(node.tagName)) return true;
  if (node.tagName === 'link') {
    const rel = node.properties?.rel;
    const rels = Array.isArray(rel) ? rel : String(rel ?? '').split(/\s+/);
    return !rels.some((r: unknown) => String(r).toLowerCase() === 'stylesheet');
  }
  return false;
}

function stripHeadOnlyElements<T extends { children?: any[] }>(node: T): T {
  if (node.children) {
    node.children = node.children
      .filter((child) => !isHeadOnlyElement(child))
      .map((child) => stripHeadOnlyElements(child));
  }
  return node;
}

const FULL_DOCUMENT_RE =
  /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype|html|head|body)[\s>]/i;

/**
 * Parse an HTML fragment to hast. If the input is a full document
 * (`<!doctype>`/`<html>`/`<head>`/`<body>`), only the `<body>` contents are
 * kept, plus any `<style>`/`<link rel="stylesheet">`/`<script>` from `<head>`.
 * Head-only elements (`<title>`, `<meta>`, `<base>`, non-stylesheet `<link>`)
 * are stripped wherever they appear.
 */
export function parseHtmlFragment(html: string) {
  let tree: any;
  if (FULL_DOCUMENT_RE.test(html)) {
    const doc: any = fromHtml(html);
    const htmlEl = doc.children.find(
      (n: any) => n.type === 'element' && n.tagName === 'html',
    );
    const part = (tagName: string) =>
      htmlEl?.children.find(
        (n: any) => n.type === 'element' && n.tagName === tagName,
      )?.children ?? [];
    tree = {
      type: 'root',
      children: [...part('head'), ...part('body')],
    };
  } else {
    // Same HTML5 parser (parse5) that rehypeRaw uses for raw HTML in pages.
    tree = fromHtml(html, { fragment: true });
  }
  return stripHeadOnlyElements(tree);
}

/**
 * Render an HTML fragment (e.g. the custom footer, `_footer.html`) to React
 * with the rehype steps raw HTML in markdown pages goes through after
 * `rehypeRaw`: no markdown parsing, URL resolution relative to `filePath`
 * (relative and root-relative `href`/`src` resolve against `filePath`'s
 * folder), external-link and table enhancements, and `FsImage` for `<img>`.
 * The trust level is the same as raw HTML in a page, except that head-only
 * elements are stripped and a full document is reduced to its body (see
 * `parseHtmlFragment`). Heading slugs/anchors are not added, so footer
 * headings can't collide with page heading ids.
 *
 * Unlike `processMarkdown`, a render error (e.g. an invalid inline `style`)
 * is thrown rather than turned into an error card, so callers can fall back.
 * The React conversion runs outside unified on purpose: a throw inside a
 * unified compiler detaches and leaves `process()` hanging.
 */
export async function processHtmlFragment(
  html: string,
  options: Pick<MarkdownOptions, 'filePath' | 'siteHostname'> & {
    /** Extra element overrides, e.g. `{ a: NavbarAnchor }` for the navbar. */
    components?: Record<string, ElementType>;
  },
) {
  const { filePath, siteHostname, components } = options;

  const processor = unified()
    .use(rehypeResolveHtmlUrls, { filePath, siteHostname })
    .use(rehypeHtmlEnhancements, {});

  const tree = await processor.run(parseHtmlFragment(html));

  return toJsxRuntime(tree as any, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
    components: { img: FsImage, ...components },
  }) as ReactElement;
}

// Get MDX options
export const getMdxOptions = ({
  filePath,
  files,
  parseFrontmatter = true,
  siteHostname,
  siteId,
  rootDir,
  permalinks,
  canvasFiles,
  canvasNodeFiles,
  changelog,
  showTags,
}: {
  filePath: string;
  files: string[];
  parseFrontmatter?: boolean;
  siteHostname: string;
  siteId?: string;
  rootDir?: string;
  permalinks?: Record<string, string>;
  canvasFiles?: Record<string, string>;
  canvasNodeFiles?: Record<string, string>;
  changelog?: RemarkChangelogOptions;
  showTags?: boolean;
}): EvaluateOptions => {
  return {
    parseFrontmatter,
    mdxOptions: {
      remarkPlugins: [
        remarkObsidianComments,
        // run this before remark-wiki-link
        [remarkCommonMarkLink, { filePath, siteHostname, permalinks }],
        [
          remarkWikiLink,
          {
            files,
            format: 'shortestPossible',
            urlResolver: getUrlResolver(siteHostname),
            permalinks,
            aliasDivider: WIKI_ALIAS_DIVIDER,
          },
        ],
        remarkYouTubeAutoEmbed,
        remarkGfm,
        [remarkSmartypants, { quotes: false, dashes: 'oldschool' }],
        remarkMath,
        remarkCallout,
        [mdxMermaid, {}],
        remarkMark,
        // `showTags === false` disables inline `#tag` pills, leaving them as text.
        ...(showTags === false ? [] : [remarkTags]),
        [remarkObsidianBases, { siteHostname, siteId, rootDir }],
        // Last remark plugin: it restructures the whole tree
        ...(changelog ? [[remarkChangelog, changelog] as Pluggable] : []),
      ],
      rehypePlugins: [
        [
          rehypeJsonCanvas,
          {
            canvasFiles: canvasFiles ?? {},
            canvasNodeFiles,
            files,
            siteHostname,
            permalinks,
          },
        ],
        rehypeUnwrapParagraphsAroundMedia,
        [rehypeResolveExplicitJsxUrls, { filePath, siteHostname }],
        [rehypeHtmlEnhancements, {}],
        rehypeSlug,
        [rehypeAutolinkHeadings, rehypeAutolinkHeadingsConfig],
        // @ts-ignore
        [rehypeKatex, { output: 'htmlAndMathml' }],
        // @ts-ignore
        [rehypePrismPlus, { ignoreMissing: true }],
        // Last: earlier plugins match JSX images by the `img` name
        rehypeZoomableJsxImages,
      ],
    },
  };
};

export const getUrlResolver = (siteHostname: string) => {
  return ({ filePath, heading }: { filePath: string; heading?: string }) => {
    // We need to concatenate filePath and heading for use with resolveContentLink
    return resolveContentLink({
      target: `${filePath}${heading ? '#' + heading : ''}`,
      siteHostname,
    });
  };
};

// Changelog page and entry titles already link to their own anchor
function isChangelogTitle(element: any): boolean {
  const className = element.properties?.className;
  return (
    Array.isArray(className) &&
    (className.includes('changelog-title') ||
      className.includes('changelog-entry-title'))
  );
}

const rehypeAutolinkHeadingsConfig: RehypeAutolinkHeadingsOptions = {
  properties: { className: ['heading-link'] },
  test(element: any) {
    return (
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(element.tagName) &&
      element.properties?.id !== 'table-of-contents' &&
      !isChangelogTitle(element) &&
      element.properties?.className !== 'blockquote-heading'
    );
  },
  content() {
    return [
      h(
        'svg',
        {
          xmlns: 'http:www.w3.org/2000/svg',
          fill: '#ab2b65',
          viewBox: '0 0 20 20',
          className: 'w-5 h-5',
        },
        [
          h('path', {
            fillRule: 'evenodd',
            clipRule: 'evenodd',
            d: 'M9.493 2.853a.75.75 0 00-1.486-.205L7.545 6H4.198a.75.75 0 000 1.5h3.14l-.69 5H3.302a.75.75 0 000 1.5h3.14l-.435 3.148a.75.75 0 001.486.205L7.955 14h2.986l-.434 3.148a.75.75 0 001.486.205L12.456 14h3.346a.75.75 0 000-1.5h-3.14l.69-5h3.346a.75.75 0 000-1.5h-3.14l.435-3.147a.75.75 0 00-1.486-.205L12.045 6H9.059l.434-3.147zM8.852 7.5l-.69 5h2.986l.69-5H8.852z',
          }),
        ],
      ),
    ];
  },
};

// Matches EITHER a genuine math span (captured in group 1) OR a single loose `$`.
// A genuine span is:
//   - `$$…$$`  — display or inline double-dollar math (may span lines), or
//   - `$…$`    — inline math where the char right after the opening `$` and the
//                char right before the closing `$` are both non-space (spaces are
//                allowed in between, e.g. `$x_2 = 4$`), the opening `$` isn't
//                backslash-escaped, and the content stays on one line.
// remark-math is too eager about pairing, so instead of relying on it we detect
// real spans ourselves and neutralise every other `$` (currency, `$HOME`, a lone
// `$`, two prices in a sentence, …) so it renders as a literal dollar sign. This
// keeps single-dollar math working — including digit-leading math like `$2*4=8$` —
// while dollar signs in prose never swallow the text between them. See issue #1359.
//
// We replace loose `$` with the numeric character reference `&#36;` rather than a
// backslash escape (`\$`). A backslash escape is only consumed by CommonMark in
// inline/text context; inside a raw HTML *block* (e.g. the `<div>`-wrapped landing
// pages) the content is passed through verbatim, so `\$` would leak a literal
// backslash into the output. `&#36;` is inert to remark-math (it's not a `$`
// character) yet decodes to `$` both in markdown text and in raw HTML. See #1359.
const MATH_SPAN_OR_LOOSE_DOLLAR =
  /(\$\$[\s\S]*?\$\$|(?<!\\)\$(?![\s$])(?:\\.|[^\n$])*?(?<![\s\\])\$)|(?<!\\)\$/g;

export function protectNonMathDollars(content: string): string {
  // Split on code fences and inline code, keeping those segments verbatim. With a
  // capturing group, split() interleaves text (even indices) and code (odd).
  return content
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g)
    .map((segment, i) =>
      i % 2 === 1
        ? segment
        : segment.replace(
            MATH_SPAN_OR_LOOSE_DOLLAR,
            // Keep genuine spans as-is; turn a loose `$` into a literal one via a
            // numeric character reference so it survives raw HTML blocks too.
            (_match, mathSpan) => (mathSpan ? mathSpan : '&#36;'),
          ),
    )
    .join('');
}
