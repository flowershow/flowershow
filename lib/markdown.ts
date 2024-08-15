import mdxMermaid from "mdx-mermaid";
import { h } from "hastscript";
import remarkCallouts from "@portaljs/remark-callouts";
import remarkEmbed from "@portaljs/remark-embed";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";
import remarkToc from "remark-toc";
import { remarkWikiLink } from "@portaljs/remark-wiki-link";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypePrismPlus from "rehype-prism-plus";


const getMdxConfig = ({
  permalinks,
  parseFrontmatter = true,
}: {
  permalinks: string[];
  parseFrontmatter?: boolean;
}) => {
  return {
    parseFrontmatter,
    mdxOptions: {
      remarkPlugins: [
        [remarkWikiLink, { permalinks, pathFormat: "obsidian-short" }],
        remarkEmbed,
        remarkGfm,
        [remarkSmartypants, { quotes: false, dashes: "oldschool" }],
        remarkMath,
        remarkCallouts,
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
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            properties: { className: "heading-link" },
            test(element: any) {
              return (
                ["h2", "h3", "h4", "h5", "h6"].includes(element.tagName) &&
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

export function processContent(content: string): string {
  return content
    .replace(/<(?!(\/?)[a-zA-Z])/g, "&lt;")
    .replace(/(?<![a-zA-Z"\\/])>/g, "&gt;");
}

export default getMdxConfig;
