jest.mock("github-slugger", () => ({
  slug: (text: string) => text.toLowerCase().replace(/\s+/g, "-"),
}));

jest.mock(
  "../config.json",
  () => ({
    siteAliases: [
      { origin: "/@olayway/blog", alias: "/blog" },
      { origin: "/@olayway/docs", alias: "/docs" },
      { origin: "/@olayway/collections", alias: "/collections" },
      { origin: "/@rufuspollock/data-notes", alias: "/notes" },
      { origin: "/@olayway/co2-ppm", alias: "/core/co2-ppm" },
    ],
  }),
  { virtual: true },
);

jest.mock("../env.mjs", () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: "test",
    NEXT_PUBLIC_ROOT_DOMAIN: "localhost:3000",
  },
}));

import "@testing-library/jest-dom";
import { resolveLinkToUrl } from "./resolve-link";

/* example site file tree:
 * /README.md
 * /about.md
 * /blog
 *   /README.md
 *   /post-1.md
 *   /post-2.md
 * /projects
 *   /README.md
 *   /project-1.md
 *   /project-2.md
 * /assets
 *   /image.jpg
 * */

describe("resolve links on a README page", () => {
  const prefix = "/@username/abc"; // this could also be url to R2 bucket site folder
  const originFilePath = "/blog/README.md";

  test("external link", () => {
    const target = "https://example.com";
    const resolved = resolveLinkToUrl({ target, originFilePath });
    expect(resolved).toBe(target);
  });

  test("absolute link", () => {
    const target = "/blog/post-1";
    const expected = `${prefix}/blog/post-1`;
    const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
    expect(resolved).toBe(expected);
  });

  test("link to home page", () => {
    const target = "/";
    const expected = `${prefix}`;
    const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
    expect(resolved).toBe(expected);
  });

  test("link ending with README", () => {
    const target = "/README";
    const expected = `${prefix}`;
    const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
    expect(resolved).toBe(expected);
  });

  test("link ending with .md extension", () => {
    const target = "post-2.md";
    const expected = `${prefix}/blog/post-2`;
    const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
    expect(resolved).toBe(expected);
  });

  test("link with no prefix", () => {
    const target = "post-2";
    const expected = `/blog/post-2`;
    const resolved = resolveLinkToUrl({ target, originFilePath });
    expect(resolved).toBe(expected);
  });

  describe("relative links", () => {
    test("same directory, no dot", () => {
      const target = "post-1";
      const expected = `${prefix}/blog/post-1`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("same directory, with dot", () => {
      const target = "./post-1";
      const expected = `${prefix}/blog/post-1`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("up a directory", () => {
      const target = "../about";
      const expected = `${prefix}/about`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("to sibling directory", () => {
      const target = "../projects/project-1";
      const expected = `${prefix}/projects/project-1`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });
  });

  describe("links with headings", () => {
    test("absolute link with heading", () => {
      const target = "/blog/post-1#introduction";
      const expected = `${prefix}/blog/post-1#introduction`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("relative link with heading", () => {
      const target = "post-1#getting-started";
      const expected = `${prefix}/blog/post-1#getting-started`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("link with heading containing spaces", () => {
      const target = "/blog/post-1#My Section Title";
      const expected = `${prefix}/blog/post-1#my-section-title`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("only heading (same page)", () => {
      const target = "#conclusion";
      const expected = `${prefix}/blog#conclusion`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("relative link up directory with heading", () => {
      const target = "../about#contact-info";
      const expected = `${prefix}/about#contact-info`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("link with .md extension and heading", () => {
      const target = "post-2.md#summary";
      const expected = `${prefix}/blog/post-2#summary`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });
  });
});

describe("resolve links on non-README page", () => {
  const prefix = "/@username/abc"; // this could also be url to R2 bucket site folder
  const originFilePath = "/blog/post-1.md";

  test("external link", () => {
    const target = "https://example.com";
    const resolved = resolveLinkToUrl({ target, originFilePath });
    expect(resolved).toBe(target);
  });

  test("absolute link", () => {
    const target = "/blog/post-2";
    const expected = `${prefix}/blog/post-2`;
    const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
    expect(resolved).toBe(expected);
  });

  test("link to home page", () => {
    const target = "/";
    const expected = `${prefix}`;
    const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
    expect(resolved).toBe(expected);
  });

  test("link ending with README", () => {
    const target = "/README";
    const expected = `${prefix}`;
    const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
    expect(resolved).toBe(expected);
  });

  test("link ending with .md extension", () => {
    const target = "post-2.md";
    const expected = `${prefix}/blog/post-2`;
    const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
    expect(resolved).toBe(expected);
  });

  test("link with no prefix", () => {
    const target = "post-2";
    const expected = `/blog/post-2`;
    const resolved = resolveLinkToUrl({ target, originFilePath });
    expect(resolved).toBe(expected);
  });

  describe("relative links", () => {
    test("same directory, no dot", () => {
      const target = "post-2";
      const expected = `${prefix}/blog/post-2`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("same directory, with dot", () => {
      const target = "./post-2";
      const expected = `${prefix}/blog/post-2`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("up a directory", () => {
      const target = "../about";
      const expected = `${prefix}/about`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("to sibling directory", () => {
      const target = "../projects/project-1";
      const expected = `${prefix}/projects/project-1`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });
  });

  describe("links with headings", () => {
    test("absolute link with heading", () => {
      const target = "/blog/post-2#introduction";
      const expected = `${prefix}/blog/post-2#introduction`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("only heading (same page)", () => {
      const target = "#conclusion";
      const expected = `${prefix}/blog/post-1#conclusion`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });

    test("relative link up directory with heading", () => {
      const target = "../about#contact-info";
      const expected = `${prefix}/about#contact-info`;
      const resolved = resolveLinkToUrl({ target, originFilePath, prefix });
      expect(resolved).toBe(expected);
    });
  });
});
