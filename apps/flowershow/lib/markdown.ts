import { remarkWikiLink } from '@flowershow/remark-wiki-link';
import remarkCallout from '@r4ai/remark-callout';
import matter from 'gray-matter';
import { h } from 'hastscript';
import mdxMermaid from 'mdx-mermaid';
import type { EvaluateOptions } from 'next-mdx-remote-client/rsc';
import { ReactElement } from 'react';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
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
import { unified } from 'unified';
// import FsImage from '@/components/public/mdx/fs-image';
import remarkObsidianComments from '@/lib/remark-obsidian-comments';
import remarkYouTubeAutoEmbed from '@/lib/remark-youtube-auto-embed';
import rehypeHtmlEnhancements from './rehype-html-enhancements';
import rehypeResolveExplicitJsxUrls from './rehype-resolve-explicit-jsx-urls';
import rehypeResolveHtmlUrls from './rehype-resolve-html-urls';
import rehypeToReact from './rehype-to-react';
import rehypeUnwrapParagraphsAroundMedia from './rehype-unwrap-paragraph-around-media';
import remarkCommonMarkLinkResolver from './remark-commonmark-link-resolver';
import remarkObsidianBases from './remark-obsidian-bases';
import remarkObsidianImageSize from './remark-obsidian-image-size';
import { resolveFilePathToUrlPath } from './resolve-link';

interface MarkdownOptions {
  filePath: string;
  files: string[];
  sitePrefix: string;
  parseFrontmatter?: boolean;
  customDomain?: string;
  siteId?: string;
  rootDir?: string;
  permalinks?: Record<string, string>;
}

// Process pure markdown files using unified
export async function processMarkdown(
  _content: string,
  options: MarkdownOptions,
) {
  const { filePath, files, sitePrefix, customDomain, permalinks } = options;

  // this strips out frontmatter, so that it's not inlined with the rest of the markdown file
  const { content } = matter(_content, {});

  const processor = unified()
    .use(remarkParse)
    .use(remarkObsidianComments)
    // run this before remark-wiki-link
    .use(remarkCommonMarkLinkResolver, {
      filePath,
      sitePrefix,
      customDomain,
    })
    .use(remarkObsidianImageSize)
    .use(remarkWikiLink, {
      files,
      format: 'shortestPossible',
      urlResolver: getUrlResolver(sitePrefix, customDomain),
      permalinks,
    })
    .use(remarkYouTubeAutoEmbed)
    .use(remarkGfm)
    .use(remarkSmartypants, { quotes: false, dashes: 'oldschool' })
    .use(remarkMath)
    .use(remarkCallout)
    .use(remarkMark)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeUnwrapParagraphsAroundMedia)
    .use(rehypeResolveHtmlUrls, { filePath, sitePrefix, customDomain })
    .use(rehypeHtmlEnhancements, { sitePrefix })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, rehypeAutolinkHeadingsConfig)
    .use(rehypeKatex, { output: 'htmlAndMathml' })
    .use(rehypePrismPlus, { ignoreMissing: true })
    // .use(rehypeToReact, {
    //   components: {
    //     img: FsImage,
    //   },
    // });
    .use(rehypeToReact);

  return (await processor.process(content)).result as ReactElement;
}

// Get MDX options
export const getMdxOptions = ({
  filePath,
  files,
  sitePrefix = '',
  parseFrontmatter = true,
  customDomain,
  siteId,
  rootDir,
  permalinks,
}: {
  filePath: string;
  files: string[];
  sitePrefix: string;
  parseFrontmatter?: boolean;
  customDomain?: string;
  siteId?: string;
  rootDir?: string;
  permalinks?: Record<string, string>;
}): EvaluateOptions => {
  return {
    parseFrontmatter,
    mdxOptions: {
      remarkPlugins: [
        remarkObsidianComments,
        // run this before remark-wiki-link
        [remarkCommonMarkLinkResolver, { filePath, sitePrefix, customDomain }],
        remarkObsidianImageSize,
        [
          remarkWikiLink,
          {
            files,
            format: 'shortestPossible',
            urlResolver: getUrlResolver(sitePrefix, customDomain),
            permalinks,
          },
        ],
        remarkYouTubeAutoEmbed,
        remarkGfm,
        [remarkSmartypants, { quotes: false, dashes: 'oldschool' }],
        remarkMath,
        remarkCallout,
        [mdxMermaid, {}],
        remarkMark,
        [remarkObsidianBases, { sitePrefix, customDomain, siteId, rootDir }],
      ],
      rehypePlugins: [
        rehypeUnwrapParagraphsAroundMedia,
        [rehypeResolveExplicitJsxUrls, { filePath, sitePrefix, customDomain }],
        [rehypeHtmlEnhancements, { sitePrefix }],
        rehypeSlug,
        [rehypeAutolinkHeadings, rehypeAutolinkHeadingsConfig],
        // @ts-ignore
        [rehypeKatex, { output: 'htmlAndMathml' }],
        // @ts-ignore
        [rehypePrismPlus, { ignoreMissing: true }],
      ],
    },
  };
};

export const getUrlResolver = (sitePrefix: string, domain?: string) => {
  return ({ filePath, heading }: { filePath: string; heading?: string }) => {
    // We need to concatenate filePath and heading for use with resolveFilePathToUrlPath
    return resolveFilePathToUrlPath({
      target: `${filePath}${heading ? '#' + heading : ''}`,
      sitePrefix,
      domain,
    });
  };
};

const rehypeAutolinkHeadingsConfig = {
  properties: { className: 'heading-link' },
  test(element: any) {
    return (
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(element.tagName) &&
      element.properties?.id !== 'table-of-contents' &&
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
