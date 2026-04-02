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
import FsImage from '@/components/public/mdx/fs-image';
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
import remarkCommonMarkLink from './remark-commonmark-link';
import remarkObsidianBases from './remark-obsidian-bases';
import { resolveFilePathToUrlPath } from './resolve-link';

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
}

// Process pure markdown files using unified
export async function processMarkdown(
  _content: string,
  options: MarkdownOptions,
) {
  const { filePath, files, siteHostname, permalinks } = options;

  // this strips out frontmatter, so that it's not inlined with the rest of the markdown file
  const { content } = matter(_content, {});

  const processor = unified()
    .use(remarkParse)
    .use(remarkObsidianComments)
    // run this before remark-wiki-link
    .use(remarkCommonMarkLink, {
      filePath,
      siteHostname,
      files,
      permalinks,
    })
    .use(remarkWikiLink, {
      files,
      format: 'shortestPossible',
      urlResolver: getUrlResolver(siteHostname),
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
      components: {
        img: FsImage,
      },
    });

  return (await processor.process(content)).result as ReactElement;
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
}): EvaluateOptions => {
  return {
    parseFrontmatter,
    mdxOptions: {
      remarkPlugins: [
        remarkObsidianComments,
        // run this before remark-wiki-link
        [remarkCommonMarkLink, { filePath, siteHostname, files, permalinks }],
        [
          remarkWikiLink,
          {
            files,
            format: 'shortestPossible',
            urlResolver: getUrlResolver(siteHostname),
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
        [remarkObsidianBases, { siteHostname, siteId, rootDir }],
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
      ],
    },
  };
};

export const getUrlResolver = (siteHostname: string) => {
  return ({ filePath, heading }: { filePath: string; heading?: string }) => {
    // We need to concatenate filePath and heading for use with resolveFilePathToUrlPath
    return resolveFilePathToUrlPath({
      target: `${filePath}${heading ? '#' + heading : ''}`,
      siteHostname,
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
