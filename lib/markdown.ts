import mdxMermaid from "mdx-mermaid";
import { h } from "hastscript";
import remarkCallout from "@r4ai/remark-callout";
import remarkYouTubeAutoEmbed from "@/lib/remark-youtube-auto-embed";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";
import remarkToc from "remark-toc";
import { remarkWikiLink } from "@flowershow/remark-wiki-link";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypePrismPlus from "rehype-prism-plus";
import remarkCommonMarkLinkResolver from "./remark-commonmark-link-resolver";
import rehypeResolveExplicitJsxUrls from "./rehype-resolve-explicit-jsx-urls";
import rehypeStringify from "rehype-stringify";
import rehypeRaw from "rehype-raw";
import { slug } from "github-slugger";
import { customEncodeUrl } from "./url-encoder";
import { unified } from "unified";
import matter from "gray-matter";

import type { EvaluateOptions } from "next-mdx-remote-client/rsc";

interface MarkdownOptions {
  filePath: string;
  permalinks: string[];
  sitePrefix: string;
  parseFrontmatter?: boolean;
  customDomain?: string;
}

// Process pure markdown files using unified
export async function processMarkdown(
  _content: string,
  options: MarkdownOptions,
) {
  const { filePath, permalinks, sitePrefix, customDomain } = options;

  // this strips out frontmatter, so that it's not inlined with the rest of the markdown file
  const { content } = matter(_content, {});

  const processor = unified()
    .use(remarkParse)
    // Add all remark plugins
    .use(remarkCommonMarkLinkResolver, { filePath, sitePrefix, customDomain })
    .use(remarkWikiLink, {
      permalinks,
      format: "shortestPossible",
      urlResolver: (wikiLinkPath) => {
        const [, rawPath = "", rawHeading = ""] =
          /^(.*?)(?:#(.*))?$/u.exec(wikiLinkPath) ?? [];

        const normalizedPath = customEncodeUrl(
          rawPath.replace(/\/?(index|README)$/, ""),
        );

        const headingAnchor = rawHeading ? `#${slug(rawHeading)}` : "";
        if (headingAnchor && !normalizedPath) {
          return headingAnchor;
        }

        return normalizedPath + headingAnchor;
      },
    })
    .use(remarkYouTubeAutoEmbed)
    .use(remarkGfm)
    .use(remarkSmartypants, { quotes: false, dashes: "oldschool" })
    .use(remarkMath)
    .use(remarkCallout)
    .use(remarkToc, {
      heading: "Table of contents",
      tight: true,
    })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeResolveExplicitJsxUrls, { filePath, sitePrefix, customDomain })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      properties: { className: "heading-link" },
      test(element: any) {
        return (
          ["h1", "h2", "h3", "h4", "h5", "h6"].includes(element.tagName) &&
          element.properties?.id !== "table-of-contents" &&
          element.properties?.className !== "blockquote-heading"
        );
      },
      content() {
        return [
          h(
            "svg",
            {
              xmlns: "http:www.w3.org/2000/svg",
              fill: "#ab2b65",
              viewBox: "0 0 20 20",
              className: "w-5 h-5",
            },
            [
              h("path", {
                fillRule: "evenodd",
                clipRule: "evenodd",
                d: "M9.493 2.853a.75.75 0 00-1.486-.205L7.545 6H4.198a.75.75 0 000 1.5h3.14l-.69 5H3.302a.75.75 0 000 1.5h3.14l-.435 3.148a.75.75 0 001.486.205L7.955 14h2.986l-.434 3.148a.75.75 0 001.486.205L12.456 14h3.346a.75.75 0 000-1.5h-3.14l.69-5h3.346a.75.75 0 000-1.5h-3.14l.435-3.147a.75.75 0 00-1.486-.205L12.045 6H9.059l.434-3.147zM8.852 7.5l-.69 5h2.986l.69-5H8.852z",
              }),
            ],
          ),
        ];
      },
    })
    .use(rehypeKatex, { output: "htmlAndMathml" })
    .use(rehypePrismPlus, { ignoreMissing: true })
    .use(rehypeStringify);

  const result = await processor.process(content);
  return result.toString();
}

// TODO this is ugly
export const getMdxOptions = ({
  filePath,
  permalinks,
  sitePrefix = "",
  parseFrontmatter = true,
  customDomain,
}: {
  filePath: string;
  permalinks: string[];
  sitePrefix: string;
  parseFrontmatter?: boolean;
  customDomain?: string;
}): EvaluateOptions => {
  return {
    parseFrontmatter,
    mdxOptions: {
      remarkPlugins: [
        [remarkCommonMarkLinkResolver, { filePath, sitePrefix, customDomain }],
        [
          remarkWikiLink,
          {
            permalinks,
            format: "shortestPossible",
            urlResolver: (wikiLinkPath) => {
              const [, rawPath = "", rawHeading = ""] =
                /^(.*?)(?:#(.*))?$/u.exec(wikiLinkPath) ?? [];

              const normalizedPath = customEncodeUrl(
                rawPath.replace(/\/?(index|README)$/, ""),
              );

              const headingAnchor = rawHeading ? `#${slug(rawHeading)}` : "";
              if (headingAnchor && !normalizedPath) {
                return headingAnchor;
              }

              return normalizedPath + headingAnchor;
            },
          },
        ],
        remarkYouTubeAutoEmbed,
        remarkGfm,
        [remarkSmartypants, { quotes: false, dashes: "oldschool" }],
        remarkMath,
        remarkCallout,
        [
          remarkToc,
          {
            heading: "Table of contents",
            tight: true,
          },
        ],
        [mdxMermaid, {}],
      ],
      rehypePlugins: [
        [rehypeResolveExplicitJsxUrls, { filePath, sitePrefix, customDomain }],
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            properties: { className: "heading-link" },
            test(element: any) {
              return (
                ["h1", "h2", "h3", "h4", "h5", "h6"].includes(
                  element.tagName,
                ) &&
                element.properties?.id !== "table-of-contents" &&
                element.properties?.className !== "blockquote-heading"
              );
            },
            content() {
              return [
                h(
                  "svg",
                  {
                    xmlns: "http:www.w3.org/2000/svg",
                    fill: "#ab2b65",
                    viewBox: "0 0 20 20",
                    className: "w-5 h-5",
                  },
                  [
                    h("path", {
                      fillRule: "evenodd",
                      clipRule: "evenodd",
                      d: "M9.493 2.853a.75.75 0 00-1.486-.205L7.545 6H4.198a.75.75 0 000 1.5h3.14l-.69 5H3.302a.75.75 0 000 1.5h3.14l-.435 3.148a.75.75 0 001.486.205L7.955 14h2.986l-.434 3.148a.75.75 0 001.486.205L12.456 14h3.346a.75.75 0 000-1.5h-3.14l.69-5h3.346a.75.75 0 000-1.5h-3.14l.435-3.147a.75.75 0 00-1.486-.205L12.045 6H9.059l.434-3.147zM8.852 7.5l-.69 5h2.986l.69-5H8.852z",
                    }),
                  ],
                ),
              ];
            },
          },
        ],
        // @ts-ignore
        [rehypeKatex, { output: "htmlAndMathml" }],
        // @ts-ignore
        [rehypePrismPlus, { ignoreMissing: true }],
      ],
    },
  };
};
