import markdown from "remark-parse";
import { unified } from "unified";
import { select } from "unist-util-select";
import { visit } from "unist-util-visit";
import { Node } from "unist";

import wikiLinkPlugin from "../src/lib/remarkWikiLink";

describe("remark-wiki-link", () => {
  describe("pathFormat", () => {
    test("parses a wiki link with 'relative' (default) pathFormat", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse("[[Wiki Link]]");
      ast = processor.runSync(ast);

      visit(ast, "wikiLink", (node: Node) => {
        expect(node.data.exists).toEqual(false);
        expect(node.data.permalink).toEqual("wiki-link");
        expect(node.data.alias).toEqual(null);
        expect(node.data.hName).toEqual("a");
        expect((node.data.hProperties as any).className).toEqual(
          "internal new"
        );
        expect((node.data.hProperties as any).href).toEqual("wiki-link");
        expect((node.data.hChildren as any)[0].value).toEqual("Wiki Link");
      });
    });

    test("parses a wiki link with 'absolute' pathFormat", () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, { pathFormat: "absolute" });

      let ast = processor.parse("[[/some/folder/Wiki Link]]");
      ast = processor.runSync(ast);

      visit(ast, "wikiLink", (node: Node) => {
        expect(node.data.exists).toEqual(false);
        expect(node.data.permalink).toEqual("/some/folder/wiki-link");
        expect(node.data.alias).toEqual(null);
        expect(node.data.hName).toEqual("a");
        expect((node.data.hProperties as any).className).toEqual(
          "internal new"
        );
        expect((node.data.hProperties as any).href).toEqual(
          "/some/folder/wiki-link"
        );
        expect((node.data.hChildren as any)[0].value).toEqual(
          "/some/folder/Wiki Link"
        );
      });
    });

    test("parses a wiki link with 'obsidian-absolute' pathFormat", () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, { pathFormat: "obsidian-absolute" });

      let ast = processor.parse("[[some/folder/Wiki Link]]");
      ast = processor.runSync(ast);

      visit(ast, "wikiLink", (node: Node) => {
        expect(node.data.exists).toEqual(false);
        expect(node.data.permalink).toEqual("/some/folder/wiki-link");
        expect(node.data.alias).toEqual(null);
        expect(node.data.hName).toEqual("a");
        expect((node.data.hProperties as any).className).toEqual(
          "internal new"
        );
        expect((node.data.hProperties as any).href).toEqual(
          "/some/folder/wiki-link"
        );
        expect((node.data.hChildren as any)[0].value).toEqual(
          "some/folder/Wiki Link"
        );
      });
    });

    test("parses a wiki link with 'obsidian-short' pathFormat", () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          permalinks: ["/some/folder/wiki-link"],
          pathFormat: "obsidian-short",
        });

      let ast = processor.parse("[[Wiki Link]]");
      ast = processor.runSync(ast);

      visit(ast, "wikiLink", (node: Node) => {
        expect(node.data.exists).toEqual(true);
        expect(node.data.permalink).toEqual("/some/folder/wiki-link");
        expect(node.data.alias).toEqual(null);
        expect(node.data.hName).toEqual("a");
        expect((node.data.hProperties as any).className).toEqual("internal");
        expect((node.data.hProperties as any).href).toEqual(
          "/some/folder/wiki-link"
        );
        expect((node.data.hChildren as any)[0].value).toEqual("Wiki Link");
      });
    });
  });

  describe("finding matching permalinks", () => {
    test("parses a wiki link that has a matching permalink", () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          permalinks: ["wiki-link"],
        });

      let ast = processor.parse("[[Wiki Link]]");
      ast = processor.runSync(ast);

      visit(ast, "wikiLink", (node: Node) => {
        expect(node.data.exists).toEqual(true);
        expect(node.data.permalink).toEqual("wiki-link");
        expect(node.data.alias).toEqual(null);
        expect(node.data.hName).toEqual("a");
        expect((node.data.hProperties as any).className).toEqual("internal");
        expect((node.data.hProperties as any).href).toEqual("wiki-link");
        expect((node.data.hChildren as any)[0].value).toEqual("Wiki Link");
      });
    });

    test("parses a wiki link that has no matching permalink", () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          permalinks: ["some-other-link"],
        });

      let ast = processor.parse("[[Wiki Link]]");
      ast = processor.runSync(ast);

      visit(ast, "wikiLink", (node: Node) => {
        expect(node.data.exists).toEqual(false);
        expect(node.data.permalink).toEqual("wiki-link");
        expect(node.data.alias).toEqual(null);
        expect(node.data.hName).toEqual("a");
        expect((node.data.hProperties as any).className).toEqual(
          "internal new"
        );
        expect((node.data.hProperties as any).href).toEqual("wiki-link");
        expect((node.data.hChildren as any)[0].value).toEqual("Wiki Link");
      });
    });

    test("parses a shortened Obsidian wiki link that has a matching permalink", () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          permalinks: ["/some/folder/wiki-link"],
          pathFormat: "obsidian-short",
        });

      let ast = processor.parse("[[Wiki Link]]");
      ast = processor.runSync(ast);

      visit(ast, "wikiLink", (node: Node) => {
        expect(node.data.exists).toEqual(true);
        expect(node.data.permalink).toEqual("/some/folder/wiki-link");
        expect(node.data.alias).toEqual(null);
        expect(node.data.hName).toEqual("a");
        expect((node.data.hProperties as any).className).toEqual("internal");
        expect((node.data.hProperties as any).href).toEqual(
          "/some/folder/wiki-link"
        );
        expect((node.data.hChildren as any)[0].value).toEqual("Wiki Link");
      });
    });

    test("parses a wiki link with heading and alias that has a matching permalink", () => {
      const processor = unified()
        .use(markdown)
        .use(wikiLinkPlugin, {
          permalinks: ["wiki-link"],
        });

      let ast = processor.parse("[[Wiki Link#With Heading|Page Alias]]");
      ast = processor.runSync(ast);

      visit(ast, "wikiLink", (node: Node) => {
        expect(node.data.exists).toEqual(true);
        expect(node.data.permalink).toEqual("wiki-link");
        expect(node.data.alias).toEqual("Page Alias");
        expect(node.data.hName).toEqual("a");
        expect((node.data.hProperties as any).className).toEqual("internal");
        expect((node.data.hProperties as any).href).toEqual(
          "wiki-link#with-heading"
        );
        expect((node.data.hChildren as any)[0].value).toEqual("Page Alias");
      });
    });
  });

  describe("image embeds", () => {
    test("parses an image embed of supported file format", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse("![[../some/folder/My Image.png]]");
      ast = processor.runSync(ast);

      visit(ast, "image", (node: Node) => {
        expect(node.data.permalink).toEqual("../some/folder/My Image.png");
        expect(node.data.hName).toEqual("img");
        expect((node.data.hProperties as any).src).toEqual(
          "../some/folder/My Image.png"
        );
      });
    });

    test("parses an image embed of unsupported file format", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse("![[../some/folder/My Image.xyz]]");
      ast = processor.runSync(ast);

      visit(ast, "image", (node: Node) => {
        expect(node.data.permalink).toEqual("../some/folder/My Image.xyz");
        expect(node.data.hName).toEqual("p");
        expect((node.data.hChildren as any)[0].value).toEqual(
          "![[../some/folder/My Image.xyz]]"
        );
      });
    });

    test("parses an image embed with alt text", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse("![[../some/folder/My Image.png|Alt Text]]");
      ast = processor.runSync(ast);

      visit(ast, "image", (node: Node) => {
        expect(node.data.permalink).toEqual("../some/folder/My Image.png");
        expect(node.data.hName).toEqual("img");
        expect((node.data.hProperties as any).src).toEqual(
          "../some/folder/My Image.png"
        );
        expect((node.data.hProperties as any).alt).toEqual("Alt Text");
      });
    });

    test("parses a pdf embed", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse("![[../some/folder/My Document.pdf]]");
      ast = processor.runSync(ast);

      visit(ast, "image", (node: Node) => {
        expect(node.data.permalink).toEqual("../some/folder/My Document.pdf");
        expect(node.data.hName).toEqual("iframe");
        expect((node.data.hProperties as any).src).toEqual(
          "../some/folder/My Document.pdf"
        );
      });
    });
  });

  describe("invalid wiki links", () => {
    test("doesn't parse a wiki link with two missing closing brackets", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse("[[Wiki Link");
      ast = processor.runSync(ast);

      expect(select("wikiLink", ast)).toEqual(null);
    });

    test("doesn't parse a wiki link with one missing closing bracket", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse("[[Wiki Link]");
      ast = processor.runSync(ast);

      expect(select("wikiLink", ast)).toEqual(null);
    });

    test("doesn't parse a wiki link with a missing opening bracket", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse("Wiki Link]]");
      ast = processor.runSync(ast);

      expect(select("wikiLink", ast)).toEqual(null);
    });

    test("doesn't parse a wiki link in single brackets", () => {
      const processor = unified().use(markdown).use(wikiLinkPlugin);

      let ast = processor.parse("[Wiki Link]");
      ast = processor.runSync(ast);

      expect(select("wikiLink", ast)).toEqual(null);
    });
  });

  test("supports different config options", () => {
    const processor = unified()
      .use(markdown)
      .use(wikiLinkPlugin, {
        aliasDivider: ":",
        pathFormat: "obsidian-short",
        permalinks: ["/some/folder/123/real-page"],
        pageResolver: (pageName: string) => [
          `123/${pageName.replace(/ /g, "-").toLowerCase()}`,
        ],
        wikiLinkClassName: "my-wiki-link-class",
        hrefTemplate: (permalink: string) => `https://my-site.com${permalink}`,
      });

    let ast = processor.parse("[[Real Page#With Heading:Page Alias]]");
    ast = processor.runSync(ast);

    visit(ast, "wikiLink", (node: Node) => {
      expect(node.data.exists).toEqual(true);
      expect(node.data.permalink).toEqual("/some/folder/123/real-page");
      expect(node.data.alias).toEqual("Page Alias");
      expect(node.data.hName).toEqual("a");
      expect((node.data.hProperties as any).className).toEqual(
        "my-wiki-link-class"
      );
      expect((node.data.hProperties as any).href).toEqual(
        "https://my-site.com/some/folder/123/real-page#with-heading"
      );
      expect((node.data.hChildren as any)[0].value).toEqual("Page Alias");
    });
  });
});
