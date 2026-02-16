# remark-wiki-link

`remark` plugin to parse and render wiki-style links like `[[...]]` and `![[...]]` in markdown. This works whatever markdown you have *and* it is particularly designed to support the Obsidian style links.

## Features supported

- [x] Support `[[Internal link]]`
- [x] Support `[[Internal link|With custom text]]`
- [x] Support `[[Internal link#heading]]`
- [x] Support `[[Internal link#heading|With custom text]]`
- [x] Support `![[Image.png]]` (images with optional dimensions: `![[image.jpg|200x300]]`)
- [x] Support `![[Video.mp4]]` (videos with optional dimensions: `![[video.mp4|640x480]]`)
- [x] Support `![[Audio.mp3]]`
- [x] Support `![[Document.pdf]]`

Future support:

- [ ] Support `![[Embed note]]`
- [ ] Support `![[Embed note#heading]]`

## Installation

```bash
npm install @flowershow/remark-wiki-link
```

## Usage

```javascript
import { unified } from "unified";
import remarkParse from "remark-parse";
import wikiLinkPlugin from "@flowershow/remark-wiki-link";

const processor = unified().use(remarkParse).use(wikiLinkPlugin);
```

## Configuration options

### `format`

Type: `"regular" | "shortestPossible"`
Default: `"shortestPossible"`

Controls how wiki link targets are matched against files:

- **`"regular"`**: Exact path matching. The wiki link target must match the file path exactly (excluding extension).
  - Example: `[[blog/my-post]]` will only match `blog/my-post.md`
- **`"shortestPossible"`**: Obsidian-style matching. The wiki link target is matched against the end of file paths, and the shortest matching path is used.
  - Example: `[[my-post]]` can match both `blog/my-post.md` and `docs/my-post.md`, but will resolve to whichever has the shorter path
  - This allows you to use short wiki links like `[[my-post]]` instead of full paths like `[[blog/my-post]]`

### `files`

Type: `Array<string>`
Default: `[]`

A list of file paths used to match wikilinks. Supports both `.md` and `.mdx` files. Wikilinks without a matching file will have the `new` class.

(When using `format: "shortestPossible"`, this list is used to resolve shortened paths to their full paths.)

### `permalinks`

Type: `Record<string, string>`
Default: `{}`

A map of file paths to their custom permalinks (e.g. `{ "path/to/file.md": "/custom-permalink" }`). When a wikilink matches a file that has a permalink defined, the permalink will be used instead of the `urlResolver`. This is useful for Obsidian-style permalink support where you want specific URLs for certain files.

**Example:**

```javascript
const processor = unified()
  .use(remarkParse)
  .use(wikiLinkPlugin, {
    files: ["blog/my-post.md", "docs/guide.md"],
    permalinks: {
      "blog/my-post.md": "/blog/custom-url",
      "docs/guide.md": "/documentation/guide",
    },
  });
```

With this configuration:

- `[[blog/my-post]]` will link to `/blog/custom-url`
- `[[blog/my-post#heading]]` will link to `/blog/custom-url#heading`
- `[[docs/guide]]` will link to `/documentation/guide`

### `className`

Type: `string`
Default: `"internal"`

Class name added to all wiki link and embed nodes.

### `newClassName`

Type: `string`
Default: `"new"`

Class name added to nodes for which no matching permalink (passed in `permalinks` option) was found.

### `urlResolver`

Type: `(name: string) => string`
Default: `(name: string) => name`

A function that resolves a wikilink (or embed) target to a URL path. The target is the part in `[[target|alias]]` or `![[target]]`.

### `aliasDivider`

Type: `string`
Default: `"|"`

The character used to separate the link target from its alias in wiki links during both parsing and stringification. For example, in `[[target|alias]]`, the divider is `|`.

This option allows you to use different wiki link syntaxes. For instance, you can use `:` as a divider by setting `aliasDivider: ":"`, which would parse and stringify links as `[[target:alias]]`.

## Generating list of files

If you're using shortest possible path format for your wiki links, you need to set `option.format: "shortestPossible"` and provide the plugin with a list of files in your content folder as `option.files`. You can generate this list using your own script or use a file system utility like `glob`:

```javascript
import { unified } from "unified";
import remarkParse from "remark-parse";
import wikiLinkPlugin from "@flowershow/remark-wiki-link";
import glob from "glob";

// Get all markdown files (both .md and .mdx)
const files = glob.sync("**/*.{md,mdx}", { cwd: "content" });

const processor = unified().use(remarkParse).use(wikiLinkPlugin, {
  format: "shortestPossible",
  files,
});
```

## Using with Obsidian permalinks

If you're using Obsidian and want to map specific files to custom URLs (permalinks), you can use the `permalinks` option:

```javascript
import { unified } from "unified";
import remarkParse from "remark-parse";
import wikiLinkPlugin from "@flowershow/remark-wiki-link";
import glob from "glob";

// Get all markdown files (both .md and .mdx)
const files = glob.sync("**/*.{md,mdx}", { cwd: "content" });

// Create a map of file paths to their custom permalinks
const permalinks = {
  "blog/2024/my-post.md": "/blog/my-custom-url",
  "docs/getting-started.md": "/docs/start",
  // ... more mappings
};

const processor = unified().use(remarkParse).use(wikiLinkPlugin, {
  format: "shortestPossible",
  files,
  permalinks,
});
```

## Running tests

```bash
npm test
```
