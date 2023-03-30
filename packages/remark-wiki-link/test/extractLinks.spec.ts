import extractLinks from "../src/utils/extractLinks";

describe("extractLinks", () => {
  test("should extract wikiLinks", () => {
    const source = "[[Page 1]] [[Page 2]] [[Page 3]]";
    const expectedLinks = ["page-1", "page-2", "page-3"];
    const links = extractLinks(source);
    expect(links).toHaveLength(expectedLinks.length);
    links.forEach((link) => {
      expect(expectedLinks).toContain(link);
    });
  });

  test("should extract CommonMark links", () => {
    const source = "[Page 1](page-1) [Page 2](page-2) [Page 3](page-3)";
    const expectedLinks = ["page-1", "page-2", "page-3"];
    const links = extractLinks(source);
    expect(links).toHaveLength(expectedLinks.length);
    links.forEach((link) => {
      expect(expectedLinks).toContain(link);
    });
  });

  test("should extract embed type wikiLinks", () => {
    const source = "![[My File.png]]]]";
    const expectedLinks = ["My File.png"];
    const links = extractLinks(source);
    expect(links[0]).toBe(expectedLinks[0]);
  });

  test("should extract embed type CommonMark links", () => {
    const source = "![](My File.png)";
    const expectedLinks = ["My File.png"];
    const links = extractLinks(source);
    expect(links[0]).toBe(expectedLinks[0]);
  });

  // TODO test for links with headings and aliases ?

  test("should return unique links", () => {
    const source = "[[Page 1]] [[Page 2]] [[Page 3]] [[Page 1]]";
    const expectedLinks = ["page-1", "page-2", "page-3"];
    const links = extractLinks(source);
    expect(links).toHaveLength(expectedLinks.length);
    links.forEach((link) => {
      expect(expectedLinks).toContain(link);
    });
  });

  test("shouldn't extract external links", () => {
    const source = "[External Link](https://example.com)";
    const links = extractLinks(source);
    expect(links).toHaveLength(0);
  });

  test("should return empty array if no links are found", () => {
    const source = "No links here";
    const links = extractLinks(source);
    expect(links).toHaveLength(0);
  });

  test("should return empty array if page is empty", () => {
    const source = "";
    const links = extractLinks(source);
    expect(links).toHaveLength(0);
  });

  describe("with base file path (slug) passed", () => {
    test("should resolve relative links to absolute links", () => {
      const baseFileSlug = "/__blog__/abc/page-1";
      const source = "[[../xyz/Page 2]] [[./Page 3]] [[Page 4]]";
      const expectedLinks = [
        "/__blog__/xyz/page-2",
        "/__blog__/abc/page-3",
        "/__blog__/abc/page-4",
      ];
      const links = extractLinks(source, baseFileSlug);
      expect(links[0]).toBe(expectedLinks[0]);
    });

    test("should return absolute links as is", () => {
      const baseFileSlug = "/__blog__/abc/page-1";
      const source = "[[/xyz/Page 2]]";
      const expectedLinks = ["/xyz/page-2"];
      const links = extractLinks(source, baseFileSlug);
      expect(links[0]).toBe(expectedLinks[0]);
    });

    // TODO tests for wiki links with shortened Obsidian paths

    // TODO tests for index pages
  });
});
