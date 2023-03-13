/* eslint import/no-unresolved: off */
import {
  ComputedFields,
  defineDocumentType,
  makeSource,
  FieldDefs,
} from "contentlayer/source-files";
import { h } from "hastscript";
import { remark } from "remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrismPlus from "rehype-prism-plus";
import rehypeSlug from "rehype-slug";
import mdxMermaid from "mdx-mermaid";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import smartypants from "remark-smartypants";
import remarkToc from "remark-toc";
import callouts from "@flowershow/remark-callouts";
import remarkEmbed from "@flowershow/remark-embed";
import stripMarkdown, { Options } from "strip-markdown";

import { siteConfig } from "./config/siteConfig";

const sharedFields: FieldDefs = {
  title: { type: "string" },
  description: { type: "string" },
  image: { type: "string" },
  layout: { type: "string", default: "docs" },
  showEditLink: { type: "boolean" },
  showToc: { type: "boolean" },
  showSidebar: { type: "boolean" },
  showComments: { type: "boolean" },
  isDraft: { type: "boolean" },
  showLinkPreview: { type: "boolean" },
  data: { type: "list", of: { type: "string" }, default: [] },
};

const computedFields: ComputedFields = {
  url_path: {
    type: "string",
    /* eslint no-underscore-dangle: off */
    resolve: (doc) => doc._raw.flattenedPath,
  },
  slug: {
    type: "string",
    /* eslint no-underscore-dangle: off */
    resolve: (doc) => doc._raw.flattenedPath.replace(/^(.+?\/)*/, ""),
  },
  title: {
    type: "string",
    /* eslint no-underscore-dangle: off */
    resolve: async (doc) => {
      // use frontmatter title if exists
      if (doc.title) return doc.title;
      // use h1 heading on first line (if exists)
      const heading = doc.body.raw.trim().match(/^#\s+(.*)/);
      if (heading) {
        const title = heading[1]
          // replace wikilink with only text value
          .replace(/\[\[([\S]*?)]]/, "$1");

        const stripTitle = await remark().use(stripMarkdown).process(title);
        return stripTitle.toString().trim();
      }
    },
  },
  description: {
    type: "string",
    /* eslint no-underscore-dangle: off */
    resolve: async (doc) => {
      // use frontmatter description if exists
      if (doc.description) return doc.description;

      const content = doc.body.raw
        // remove commented lines
        .replace(/{\/\*.*\*\/}/g, "")
        // remove import statements
        .replace(
          /^import\s*(?:\{\s*[\w\s,\n]+\s*\})?(\s*(\w+))?\s*from\s*("|')[^"]+("|');?$/gm,
          ""
        )
        // remove youtube links
        .replace(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/gm, "")
        // replace wikilinks with only text
        .replace(/([^!])\[\[(\S*?)\]]/g, "$1$2")
        // remove wikilink images
        .replace(/!\[[\S]*?]]/g, "");

      // remove markdown formatting
      const stripped = await remark()
        .use(stripMarkdown, {
          remove: ["heading", "blockquote", "list", "image", "html", "code"],
        } as Options)
        .process(content);

      if (stripped.value) {
        const description: string = stripped.value.toString().slice(0, 200);
        return description + "...";
      }
    },
  },
  edit_url: {
    type: "string",
    resolve: (post) =>
      siteConfig.editLinkRoot
        ? /* eslint no-underscore-dangle: off */
        `${siteConfig.editLinkRoot}/${post._raw.sourceFilePath}`
        : undefined,
  },
};

const Page = defineDocumentType(() => ({
  name: "Page",
  filePathPattern: "**/*.md*",
  contentType: "mdx",
  fields: {
    ...sharedFields,
  },
  computedFields,
}));

const Blog = defineDocumentType(() => ({
  name: "Blog",
  filePathPattern: `${siteConfig.blogDir}/!(index)*.md*`,
  contentType: "mdx",
  fields: {
    ...sharedFields,
    layout: { type: "string", default: "blog" },
    created: { type: "date", required: true },
    authors: {
      type: "list",
      of: { type: "string" },
    },
    tags: {
      type: "list",
      of: { type: "string" },
    },
  },
  computedFields,
}));

export const Person = defineDocumentType(() => ({
  name: "Person",
  filePathPattern: `${siteConfig.peopleDir}/!(index)*.md*`,
  contentType: "mdx",
  fields: {
    ...sharedFields,
    id: {
      type: "string",
    },
    name: {
      type: "string",
      required: true,
    },
    avatar: {
      type: "string",
      default: siteConfig.avatarPlaceholder,
    },
    email: {
      type: "string",
    },
    twitter: {
      type: "string",
    },
    linkedin: {
      type: "string",
    },
    github: {
      type: "string",
    },
  },
  computedFields,
}));

export const Doc = defineDocumentType(() => ({
  name: "Doc",
  filePathPattern: `docs/**/!(index)*.md*`,
  contentType: "mdx",
  fields: {
    ...sharedFields,
    layout: { type: "string", default: "docs" },
    date: {
      type: "date",
    },
    modified: {
      type: "date",
    },
    authors: {
      type: "list",
      of: { type: "string" },
    },
    author: {
      type: "string",
    },
    excerpt: {
      type: "string"
    }
  },
  computedFields: {
    ...computedFields,
    category: {
      type: "string",
      /* eslint no-underscore-dangle: off */
      resolve: (doc) => {
        const path = doc._raw.flattenedPath;
        const category = path.match(/^docs\/(.+)\//);

        //  Return first captured group
        if (category && category.length > 0) {
          return category[1];
        }
        return null;
      }
    }
  },
}));

export const Collection = defineDocumentType(() => ({
  name: "Collection",
  filePathPattern: `collections/**/!(index)*.md*`,
  contentType: "mdx",
  fields: {
    ...sharedFields,
    layout: { type: "string", default: "collection" },
    date: {
      type: "date",
    },
    modified: {
      type: "date",
    },
    authors: {
      type: "list",
      of: { type: "string" },
    },
    author: {
      type: "string",
    },
  },
  computedFields
}));

const contentLayerExcludeDefaults = [
  "node_modules",
  ".git",
  ".yarn",
  ".cache",
  ".next",
  ".contentlayer",
  "package.json",
  "tsconfig.json",
];

/* eslint import/no-default-export: off */
export default makeSource({
  contentDirPath: siteConfig.content,
  contentDirExclude: contentLayerExcludeDefaults.concat([
    ".flowershow",
    ".obsidian",
    ...siteConfig.contentExclude,
  ]),
  contentDirInclude: siteConfig.contentInclude,
  documentTypes: [Collection, Doc, Blog, Person, Page],
  mdx: {
    esbuildOptions: (opts) => {
      opts.tsconfig = `${process.env.PWD}/tsconfig.mdx.json`;
      return opts;
    },
    cwd: process.cwd(),
    remarkPlugins: [
      remarkEmbed,
      remarkGfm,
      [smartypants, { quotes: false, dashes: "oldschool" }],
      remarkMath,
      callouts,
      [
        remarkToc,
        {
          heading: "Table of contents",
          // maxDepth: "3",
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
          test(element) {
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
                  xmlns: "http://www.w3.org/2000/svg",
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
                ]
              ),
            ];
          },
        },
      ],
      [rehypePrismPlus, { ignoreMissing: true }],
    ],
  },
});
