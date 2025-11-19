import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkObsidianImageSize from "./remark-obsidian-image-size";

describe("remarkObsidianImageSize", () => {
  const processMarkdown = async (input: string) => {
    const result = await unified()
      .use(remarkParse)
      .use(remarkObsidianImageSize)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(input);
    return result.toString();
  };

  it("should add width and height attributes for widthxheight format", async () => {
    const input = "![250x100](https://example.com/image.jpg)";
    const output = await processMarkdown(input);
    expect(output).toContain('width="250"');
    expect(output).toContain('height="100"');
    expect(output).toContain('style="width: 250px; height: 100px;"');
    expect(output).toContain('alt=""');
  });

  it("should add only width attribute for width-only format", async () => {
    const input = "![250](https://example.com/image.jpg)";
    const output = await processMarkdown(input);
    expect(output).toContain('width="250"');
    expect(output).not.toContain("height=");
    expect(output).toContain('style="width: 250px;"');
    expect(output).toContain('alt=""');
  });

  it("should preserve alt text that contains more than just dimensions", async () => {
    const input = "![My image 250x100](https://example.com/image.jpg)";
    const output = await processMarkdown(input);
    expect(output).toContain('alt="My image 250x100"');
    expect(output).not.toContain("width=");
    expect(output).not.toContain("height=");
  });

  it("should preserve alt text with dimensions at the end", async () => {
    const input = "![Beautiful sunset 500](https://example.com/image.jpg)";
    const output = await processMarkdown(input);
    expect(output).toContain('alt="Beautiful sunset 500"');
    expect(output).not.toContain("width=");
  });

  it("should not modify images without dimension patterns", async () => {
    const input = "![A regular image](https://example.com/image.jpg)";
    const output = await processMarkdown(input);
    expect(output).toContain('alt="A regular image"');
    expect(output).not.toContain("width=");
    expect(output).not.toContain("height=");
  });

  it("should handle empty alt text", async () => {
    const input = "![](https://example.com/image.jpg)";
    const output = await processMarkdown(input);
    expect(output).toContain('alt=""');
    expect(output).not.toContain("width=");
    expect(output).not.toContain("height=");
  });
});
