import { syntax } from "../src/lib/syntax";
import { html } from "../src/lib/html";
import { micromark } from "micromark";

describe("micromark-extension-wiki-link", () => {
  describe("Parses a wikilink", () => {
    test("that has a matching file", () => {
      const serialized = micromark("[[Wiki Link]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html({ files: ["Wiki Link.md"] })],
      });
      expect(serialized).toBe(
        '<p><a href="Wiki Link" class="internal">Wiki Link</a></p>',
      );
    });

    test("that doesn't have a matching file", () => {
      const serialized = micromark("[[New Page]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><a href="New Page" class="internal new">New Page</a></p>',
      );
    });

    test("to a README file with a matching file", () => {
      const serialized = micromark("[[/blog/README]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [
          html({
            files: ["/blog/README.md"],
          }),
        ],
      });
      expect(serialized).toBe(
        '<p><a href="/blog" class="internal">/blog/README</a></p>',
      );
    });

    test("with a heading", () => {
      const serialized = micromark("[[Wiki Link#Some Heading]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><a href="Wiki Link#some-heading" class="internal new">Wiki Link#Some Heading</a></p>',
      );
    });

    test("with heading and alias", () => {
      const serialized = micromark(
        "[[Wiki Link#Some Heading|Alias]]",
        "ascii",
        {
          extensions: [syntax()],
          htmlExtensions: [html()],
        },
      );
      expect(serialized).toBe(
        '<p><a href="Wiki Link#some-heading" class="internal new">Alias</a></p>',
      );
    });

    test("with a heading with special characters", () => {
      const serialized = micromark(
        "[[Wiki Link#Some.Heading.With-♥-Unicode and spaces]]",
        "ascii",
        {
          extensions: [syntax()],
          htmlExtensions: [html()],
        },
      );
      expect(serialized).toBe(
        '<p><a href="Wiki Link#someheadingwith--unicode-and-spaces" class="internal new">Wiki Link#Some.Heading.With-♥-Unicode and spaces</a></p>',
      );
    });

    test("to a heading on the same page", () => {
      const serialized = micromark("[[#Heading On Same Page]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><a href="#heading-on-same-page" class="internal">#Heading On Same Page</a></p>',
      );
    });

    test("with an alias", () => {
      const serialized = micromark("[[Wiki Link|Alias]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><a href="Wiki Link" class="internal new">Alias</a></p>',
      );
    });

    test("with an alias inside a table", () => {
      const markdown = `| Column 1 | Column 2  | Column 3 |
| -------- | --------------------------------- | -------- |
| Data 1   | [[post-1\|Link with Alias]]       | Data 2   |`;
      const serialized = micromark(markdown, "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        `<p>| Column 1 | Column 2  | Column 3 |
| -------- | --------------------------------- | -------- |
| Data 1   | <a href="post-1" class="internal new">Link with Alias</a>       | Data 2   |</p>`,
      );
    });

    test("with Obsidian-style shortest possible path format and a matching file", () => {
      const serialized = micromark("[[Wiki Link]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [
          html({
            files: ["/some/folder/Wiki Link.md"],
            format: "shortestPossible",
          }),
        ],
      });
      expect(serialized).toBe(
        '<p><a href="/some/folder/Wiki Link" class="internal">Wiki Link</a></p>',
      );
    });
  });

  describe("Parses an embed", () => {
    test("image", () => {
      const serialized = micromark("![[My Image.jpg]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><img src="My Image.jpg" alt="My Image" class="internal new" /></p>',
      );
    });

    test("image with a matching file", () => {
      const serialized = micromark("![[My Image.jpg]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [
          html({
            files: ["My Image.jpg"],
          }),
        ],
      });
      expect(serialized).toBe(
        '<p><img src="My Image.jpg" alt="My Image" class="internal" /></p>',
      );
    });

    test("pdf", () => {
      const serialized = micromark("![[My Document.pdf]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><iframe width="100%" src="My Document.pdf" title="My Document" class="internal new" /></p>',
      );
    });

    test("unsupported file format", () => {
      const serialized = micromark("![[My Image.xyz]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><a href="My Image.xyz" class="internal new unsupported">My Image.xyz</a></p>',
      );
    });

    test("image with a matching file", () => {
      const serialized = micromark("![[My Image.jpg]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html({ files: ["My Image.jpg"] })],
      });
      expect(serialized).toBe(
        '<p><img src="My Image.jpg" alt="My Image" class="internal" /></p>',
      );
    });

    test("image with a matching file and shortestPossible path format", () => {
      const serialized = micromark("![[My Image.jpg]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [
          html({
            format: "shortestPossible",
            files: ["/assets/My Image.jpg"],
          }),
        ],
      });
      expect(serialized).toBe(
        '<p><img src="/assets/My Image.jpg" alt="My Image" class="internal" /></p>',
      );
    });

    test("image with width", () => {
      const serialized = micromark("![[My Image.jpg|200]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html({ files: ["My Image.jpg"] })],
      });
      expect(serialized).toBe(
        '<p><img src="My Image.jpg" alt="My Image" class="internal" width="200" style="width: 200px" /></p>',
      );
    });

    test("image with width and height", () => {
      const serialized = micromark("![[My Image.jpg|200x300]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html({ files: ["My Image.jpg"] })],
      });
      expect(serialized).toBe(
        '<p><img src="My Image.jpg" alt="My Image" class="internal" width="200" height="300" style="width: 200px; height: 300px" /></p>',
      );
    });

    test("markdown note transclusion as a regular wiki link (with extra class)", () => {
      const serialized = micromark("![[Some Page]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><a href="Some Page" class="internal new transclusion">Some Page</a></p>',
      );
    });

    test("video", () => {
      const serialized = micromark("![[My Video.mp4]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><video src="My Video.mp4" class="internal new" controls>Your browser does not support the video tag.</video></p>',
      );
    });

    test("video with dimensions", () => {
      const serialized = micromark("![[My Video.mp4|640x480]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><video src="My Video.mp4" class="internal new" controls width="640" height="480" style="width: 640px; height: 480px">Your browser does not support the video tag.</video></p>',
      );
    });

    test("video with width only", () => {
      const serialized = micromark("![[My Video.mp4|640]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><video src="My Video.mp4" class="internal new" controls width="640" style="width: 640px">Your browser does not support the video tag.</video></p>',
      );
    });

    test("audio", () => {
      const serialized = micromark("![[My Audio.mp3]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><audio src="My Audio.mp3" class="internal new" controls>Your browser does not support the audio tag.</audio></p>',
      );
    });
  });

  describe("Doesn't parse invalid wiki links", () => {
    test("empty wikilink", () => {
      const serialized = micromark("[[]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe("<p>[[]]</p>");
    });

    test("with single brackets", () => {
      const serialized = micromark("[Wiki Link]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe("<p>[Wiki Link]</p>");
    });

    test("with 1 missing closing bracket", () => {
      const serialized = micromark("[[Wiki Link]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe("<p>[[Wiki Link]</p>");
    });

    test("with 2 missing closing brackets", () => {
      const serialized = micromark("[[Wiki Link", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe("<p>[[Wiki Link</p>");
    });

    test("with 1 missing opening bracket", () => {
      const serialized = micromark("[Wiki Link]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe("<p>[Wiki Link]]</p>");
    });
  });

  describe("Supports config options", () => {
    test("custom classes", () => {
      const serialized = micromark("[[Wiki Link]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [
          html({
            className: "test-wiki-link",
            newClassName: "test-new",
          }),
        ],
      });
      expect(serialized).toBe(
        '<p><a href="Wiki Link" class="test-wiki-link test-new">Wiki Link</a></p>',
      );
    });

    test("custom alias divider", () => {
      const serialized = micromark("[[Wiki Link:Alias Name]]", "ascii", {
        extensions: [syntax({ aliasDivider: ":" })],
        htmlExtensions: [html()],
      });
      expect(serialized).toBe(
        '<p><a href="Wiki Link" class="internal new">Alias Name</a></p>',
      );
    });

    test("custom urlResolver", () => {
      const urlResolver = ({
        filePath,
        isEmbed,
      }: {
        filePath: string;
        isEmbed: boolean;
      }) => {
        if (!isEmbed) {
          // Remove .md extension and then process
          const pathWithoutExt = filePath.replace(/\.md$/, "");
          return pathWithoutExt.replace(/\s+/g, "-").toLowerCase();
        }
        return filePath;
      };

      const serialized = micromark("![[My Image.jpg]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [
          html({
            files: ["/assets/My Image.jpg"],
            urlResolver,
          }),
        ],
      });
      expect(serialized).toBe(
        '<p><img src="/assets/My Image.jpg" alt="My Image" class="internal" /></p>',
      );

      const serialized2 = micromark("[[post]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [
          html({
            files: ["/blog/post.md"],
            urlResolver,
          }),
        ],
      });
      expect(serialized2).toBe(
        '<p><a href="/blog/post" class="internal">post</a></p>',
      );
    });

    test("case-insensitive matching by default", () => {
      const serialized = micromark("[[wiki link]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [html({ files: ["Wiki Link.md"] })],
      });
      expect(serialized).toBe(
        '<p><a href="Wiki Link" class="internal">wiki link</a></p>',
      );
    });

    test("case-insensitive matching when explicitly enabled", () => {
      const serialized = micromark("[[BLOG/POST]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [
          html({
            files: ["/blog/post.md"],
            caseInsensitive: true,
          }),
        ],
      });
      expect(serialized).toBe(
        '<p><a href="/blog/post" class="internal">BLOG/POST</a></p>',
      );
    });

    test("case-sensitive matching when disabled", () => {
      const serialized = micromark("[[wiki link]]", "ascii", {
        extensions: [syntax()],
        htmlExtensions: [
          html({
            files: ["Wiki Link.md"],
            caseInsensitive: false,
          }),
        ],
      });
      expect(serialized).toBe(
        '<p><a href="wiki link" class="internal new">wiki link</a></p>',
      );
    });
  });
});
