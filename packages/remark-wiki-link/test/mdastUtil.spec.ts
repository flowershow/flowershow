import { visit } from "unist-util-visit";
import { syntax } from "../src/lib/syntax";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { fromMarkdown as wikiLinkFromMarkdown } from "../src/lib/fromMarkdown";
import { toMarkdown as wikiLinkToMarkdown } from "../src/lib/toMarkdown";

describe("mdast-util-wiki-link", () => {
  describe("fromMarkdown - Parses a wikilink", () => {
    test("that has a matching file", () => {
      const ast = fromMarkdown("[[Wiki Link]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: ["Wiki Link.md"],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("Wiki Link");
        expect(node.data.path).toBe("Wiki Link");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(true);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal");
        expect(node.data.hProperties?.href).toBe("Wiki Link");
        expect(node.data.hChildren?.[0].value).toBe("Wiki Link");
      });
    });

    test("that doesn't have a matching file", () => {
      const ast = fromMarkdown("[[New Page]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: [],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("New Page");
        expect(node.data.path).toBe("New Page");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.href).toBe("New Page");
        expect(node.data.hChildren?.[0].value).toBe("New Page");
      });
    });

    test("to a README file with a matching file", () => {
      const ast = fromMarkdown("[[/blog/README]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: ["/blog/README.md"],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("/blog/README");
        expect(node.data.path).toBe("/blog");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(true);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal");
        expect(node.data.hProperties?.href).toBe("/blog");
        expect(node.data.hChildren?.[0].value).toBe("/blog/README");
      });
    });

    test("with a heading", () => {
      const ast = fromMarkdown("[[Wiki Link#Some Heading]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: [],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("Wiki Link#Some Heading");
        expect(node.data.path).toBe("Wiki Link#some-heading");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.href).toBe("Wiki Link#some-heading");
        expect(node.data.hChildren?.[0].value).toBe("Wiki Link#Some Heading");
      });
    });

    test("with heading and alias", () => {
      const ast = fromMarkdown("[[Wiki Link#Some Heading|Alias]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: [],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("Wiki Link#Some Heading");
        expect(node.data.path).toBe("Wiki Link#some-heading");
        expect(node.data.alias).toBe("Alias");
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.href).toBe("Wiki Link#some-heading");
        expect(node.data.hChildren?.[0].value).toBe("Alias");
      });
    });

    test("with a heading with special characters", () => {
      const ast = fromMarkdown(
        "[[Wiki Link#Some.Heading.With-♥-Unicode and spaces]]",
        {
          extensions: [syntax()],
          mdastExtensions: [
            wikiLinkFromMarkdown({
              files: [],
            }),
          ],
        },
      );

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe(
          "Wiki Link#Some.Heading.With-♥-Unicode and spaces",
        );
        expect(node.data.path).toBe(
          "Wiki Link#someheadingwith--unicode-and-spaces",
        );
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.href).toBe(
          "Wiki Link#someheadingwith--unicode-and-spaces",
        );
        expect(node.data.hChildren?.[0].value).toBe(
          "Wiki Link#Some.Heading.With-♥-Unicode and spaces",
        );
      });
    });

    test("to a heading on the same page", () => {
      const ast = fromMarkdown("[[#Some Heading]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: [],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("#Some Heading");
        expect(node.data.path).toBe("#some-heading");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(true);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal");
        expect(node.data.hProperties?.href).toBe("#some-heading");
        expect(node.data.hChildren?.[0].value).toBe("#Some Heading");
      });
    });

    test("with an alias", () => {
      const ast = fromMarkdown("[[Wiki Link|Alias]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: [],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("Wiki Link");
        expect(node.data.path).toBe("Wiki Link");
        expect(node.data.alias).toBe("Alias");
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.href).toBe("Wiki Link");
        expect(node.data.hChildren?.[0].value).toBe("Alias");
      });
    });

    test("with an alias inside a table", () => {
      const markdown = `| Column 1 | Column 2  | Column 3 |
| -------- | --------------------------------- | -------- |
| Data 1   | [[post-1\|Link with Alias]]       | Data 2   |`;
      const ast = fromMarkdown(markdown, {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: [],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("post-1");
        expect(node.data.path).toBe("post-1");
        expect(node.data.alias).toBe("Link with Alias");
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.href).toBe("post-1");
        expect(node.data.hChildren?.[0].value).toBe("Link with Alias");
      });
    });

    test("with Obsidian-style shortest possible path format and a matching file", () => {
      const ast = fromMarkdown("[[Wiki Link]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            format: "shortestPossible",
            files: ["/some/folder/Wiki Link.md"],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("Wiki Link");
        expect(node.data.path).toBe("/some/folder/Wiki Link");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(true);
        expect(node.data.hName).toBe("a");
        expect(node.data.hProperties?.className).toBe("internal");
        expect(node.data.hProperties?.href).toBe("/some/folder/Wiki Link");
        expect(node.data.hChildren?.[0].value).toBe("Wiki Link");
      });
    });
  });

  describe("fromMarkdown - Parses an embed", () => {
    test("image", () => {
      const ast = fromMarkdown("![[My Image.jpg]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      visit(ast, "embed", (node) => {
        expect(node.value).toBe("My Image.jpg");
        expect(node.data.path).toBe("My Image.jpg");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("img");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.src).toBe("My Image.jpg");
        expect(node.data.hProperties?.alt).toBe("My Image");
      });
    });

    test("image with dimensions", () => {
      const ast = fromMarkdown("![[My Image.jpg|200x300]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      visit(ast, "embed", (node) => {
        expect(node.value).toBe("My Image.jpg");
        expect(node.data.path).toBe("My Image.jpg");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("img");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.src).toBe("My Image.jpg");
        expect(node.data.hProperties?.width).toBe("200");
        expect(node.data.hProperties?.height).toBe("300");
        expect(node.data.hProperties?.alt).toBe("My Image");
        expect(node.data.hProperties?.style).toBe(
          "width: 200px; height: 300px",
        );
      });
    });

    test("pdf", () => {
      const ast = fromMarkdown("![[My File.pdf]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      visit(ast, "embed", (node) => {
        expect(node.value).toBe("My File.pdf");
        expect(node.data.path).toBe("My File.pdf");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("iframe");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.src).toBe("My File.pdf");
        expect(node.data.hProperties?.title).toBe("My File");
      });
    });

    test("video", () => {
      const ast = fromMarkdown("![[My Video.mp4]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      visit(ast, "embed", (node) => {
        expect(node.value).toBe("My Video.mp4");
        expect(node.data.path).toBe("My Video.mp4");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("video");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.src).toBe("My Video.mp4");
        expect(node.data.hProperties?.controls).toBe(true);
        expect(node.data.hChildren?.[0].value).toBe(
          "Your browser does not support the video tag.",
        );
      });
    });

    test("video with dimensions", () => {
      const ast = fromMarkdown("![[My Video.mp4|640x480]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      visit(ast, "embed", (node) => {
        expect(node.value).toBe("My Video.mp4");
        expect(node.data.path).toBe("My Video.mp4");
        // Alias is cleared when dimensions are parsed
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("video");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.src).toBe("My Video.mp4");
        expect(node.data.hProperties?.controls).toBe(true);
        expect(node.data.hProperties?.width).toBe("640");
        expect(node.data.hProperties?.height).toBe("480");
        expect(node.data.hProperties?.style).toBe(
          "width: 640px; height: 480px",
        );
        expect(node.data.hChildren?.[0].value).toBe(
          "Your browser does not support the video tag.",
        );
      });
    });

    test("video with width only", () => {
      const ast = fromMarkdown("![[My Video.mp4|640]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      visit(ast, "embed", (node) => {
        expect(node.value).toBe("My Video.mp4");
        expect(node.data.path).toBe("My Video.mp4");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("video");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.src).toBe("My Video.mp4");
        expect(node.data.hProperties?.controls).toBe(true);
        expect(node.data.hProperties?.width).toBe("640");
        // Height should be undefined to maintain aspect ratio
        expect(node.data.hProperties?.height).toBe(undefined);
        expect(node.data.hProperties?.style).toBe("width: 640px");
      });
    });

    test("audio", () => {
      const ast = fromMarkdown("![[My Audio.mp3]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      visit(ast, "embed", (node) => {
        expect(node.value).toBe("My Audio.mp3");
        expect(node.data.path).toBe("My Audio.mp3");
        expect(node.data.alias).toBe(undefined);
        expect(node.data.existing).toBe(false);
        expect(node.data.hName).toBe("audio");
        expect(node.data.hProperties?.className).toBe("internal new");
        expect(node.data.hProperties?.src).toBe("My Audio.mp3");
        expect(node.data.hProperties?.controls).toBe(true);
        expect(node.data.hChildren?.[0].value).toBe(
          "Your browser does not support the audio tag.",
        );
      });
    });

    test("audio with various formats", () => {
      const formats = ["mp3", "wav", "ogg", "m4a", "flac", "3gp"];

      formats.forEach((format) => {
        const ast = fromMarkdown(`![[audio.${format}]]`, {
          extensions: [syntax()],
          mdastExtensions: [wikiLinkFromMarkdown()],
        });

        visit(ast, "embed", (node) => {
          expect(node.data.hName).toBe("audio");
          expect(node.data.hProperties?.controls).toBe(true);
        });
      });
    });

    test("video with various formats", () => {
      const formats = ["mp4", "webm", "ogv", "mov", "mkv"];

      formats.forEach((format) => {
        const ast = fromMarkdown(`![[video.${format}]]`, {
          extensions: [syntax()],
          mdastExtensions: [wikiLinkFromMarkdown()],
        });

        visit(ast, "embed", (node) => {
          expect(node.data.hName).toBe("video");
          expect(node.data.hProperties?.controls).toBe(true);
        });
      });
    });
  });

  describe("fromMarkdown - Permalinks", () => {
    test("uses permalink when file matches and permalink is provided", () => {
      const ast = fromMarkdown("[[blog/my-post]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: ["blog/my-post.md"],
            permalinks: {
              "blog/my-post.md": "/custom-url",
            },
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("blog/my-post");
        expect(node.data.path).toBe("/custom-url");
        expect(node.data.existing).toBe(true);
        expect(node.data.hProperties?.href).toBe("/custom-url");
        expect(node.data.hProperties?.className).toBe("internal");
      });
    });

    test("uses permalink with heading when provided", () => {
      const ast = fromMarkdown("[[blog/my-post#Section]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: ["blog/my-post.md"],
            permalinks: {
              "blog/my-post.md": "/custom-url",
            },
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("blog/my-post#Section");
        expect(node.data.path).toBe("/custom-url#Section");
        expect(node.data.existing).toBe(true);
        expect(node.data.hProperties?.href).toBe("/custom-url#Section");
      });
    });

    test("falls back to urlResolver when no permalink is provided", () => {
      const ast = fromMarkdown("[[blog/my-post]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: ["blog/my-post.md"],
            permalinks: {
              "other/file.md": "/other-url",
            },
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("blog/my-post");
        expect(node.data.path).toBe("blog/my-post");
        expect(node.data.existing).toBe(true);
        expect(node.data.hProperties?.href).toBe("blog/my-post");
      });
    });

    test("works with shortestPossible format", () => {
      const ast = fromMarkdown("[[test]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: ["blog/test.md", "test.md"],
            permalinks: {
              "blog/test.md": "/blog-permalink",
              "test.md": "/test-permalink",
            },
            format: "shortestPossible",
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("test");
        // Should match test.md (shortest path)
        expect(node.data.path).toBe("/test-permalink");
        expect(node.data.existing).toBe(true);
        expect(node.data.hProperties?.href).toBe("/test-permalink");
      });
    });

    test("permalink is applied to embeds", () => {
      const ast = fromMarkdown("![[image.jpg]]", {
        extensions: [syntax()],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: ["assets/image.jpg"],
            permalinks: {
              "assets/image.jpg": "/custom-image-url",
            },
          }),
        ],
      });

      visit(ast, "embed", (node) => {
        expect(node.value).toBe("image.jpg");
        // Embeds should use the permalink when available
        expect(node.data.path).toBe("/custom-image-url");
        expect(node.data.hProperties?.src).toBe("/custom-image-url");
      });
    });
  });

  describe("fromMarkdown - Custom alias divider", () => {
    test("parses wiki link with custom divider", () => {
      const ast = fromMarkdown("[[Wiki Link:Alias]]", {
        extensions: [syntax({ aliasDivider: ":" })],
        mdastExtensions: [
          wikiLinkFromMarkdown({
            files: [],
          }),
        ],
      });

      visit(ast, "wikiLink", (node) => {
        expect(node.value).toBe("Wiki Link");
        expect(node.data.alias).toBe("Alias");
        expect(node.data.hChildren?.[0].value).toBe("Alias");
      });
    });

    test("parses embed with colon divider", () => {
      const ast = fromMarkdown("![[image.jpg:Alt Text]]", {
        extensions: [syntax({ aliasDivider: ":" })],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      visit(ast, "embed", (node) => {
        expect(node.value).toBe("image.jpg");
        expect(node.data.alias).toBe("Alt Text");
      });
    });

    test("round-trip with custom divider maintains consistency", () => {
      const original = "[[Page:Alias]]";
      const ast = fromMarkdown(original, {
        extensions: [syntax({ aliasDivider: ":" })],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown({ aliasDivider: ":" })],
      }).trim();

      expect(stringified).toBe(original);
    });

    test("converts between different dividers during round-trip", () => {
      const original = "[[Page|Alias]]";
      const ast = fromMarkdown(original, {
        extensions: [syntax({ aliasDivider: "|" })],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown({ aliasDivider: "->" })],
      }).trim();

      expect(stringified).toBe("[[Page->Alias]]");
    });
  });

  describe("toMarkdown - wikiLink handler", () => {
    test("stringifies a simple wiki link", () => {
      const ast = fromMarkdown("[[Wiki Link]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown()],
      }).trim();

      expect(stringified).toBe("[[Wiki Link]]");
    });

    test("stringifies a wiki link with alias using default divider", () => {
      const ast = fromMarkdown("[[Real Page|Page Alias]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown()],
      }).trim();

      expect(stringified).toBe("[[Real Page|Page Alias]]");
    });

    test("stringifies a wiki link with alias using custom divider", () => {
      const ast = fromMarkdown("[[Real Page:Page Alias]]", {
        extensions: [syntax({ aliasDivider: ":" })],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown({ aliasDivider: ":" })],
      }).trim();

      expect(stringified).toBe("[[Real Page:Page Alias]]");
    });

    test("stringifies a wiki link with heading", () => {
      const ast = fromMarkdown("[[Wiki Link#Some Heading]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown()],
      }).trim();

      expect(stringified).toBe("[[Wiki Link#Some Heading]]");
    });

    test("stringifies a wiki link with heading and alias", () => {
      const ast = fromMarkdown("[[Wiki Link#Some Heading|Alias]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown()],
      }).trim();

      expect(stringified).toBe("[[Wiki Link#Some Heading|Alias]]");
    });

    test("stringifies a wiki link to a heading on the same page", () => {
      const ast = fromMarkdown("[[#Some Heading]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown()],
      }).trim();

      expect(stringified).toBe("[[#Some Heading]]");
    });

    test("stringifies a wiki link with path", () => {
      const ast = fromMarkdown("[[folder/subfolder/Page]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown()],
      }).trim();

      expect(stringified).toBe("[[folder/subfolder/Page]]");
    });
  });

  describe("toMarkdown - embed handler", () => {
    test("stringifies a simple embed", () => {
      const ast = fromMarkdown("![[My Image.jpg]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown()],
      }).trim();

      expect(stringified).toBe("![[My Image.jpg]]");
    });

    test("stringifies an embed with alias using default divider", () => {
      const ast = fromMarkdown("![[My Image.jpg|Alt Text]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown()],
      }).trim();

      expect(stringified).toBe("![[My Image.jpg|Alt Text]]");
    });

    test("stringifies an embed with alias using custom divider", () => {
      const ast = fromMarkdown("![[My Image.jpg:Alt Text]]", {
        extensions: [syntax({ aliasDivider: ":" })],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown({ aliasDivider: ":" })],
      }).trim();

      expect(stringified).toBe("![[My Image.jpg:Alt Text]]");
    });

    test("stringifies an embed with dimensions", () => {
      const ast = fromMarkdown("![[My Image.jpg|200x300]]", {
        extensions: [syntax()],
        mdastExtensions: [wikiLinkFromMarkdown()],
      });

      const stringified = toMarkdown(ast, {
        extensions: [wikiLinkToMarkdown()],
      }).trim();

      expect(stringified).toBe("![[My Image.jpg|200x300]]");
    });
  });
});
