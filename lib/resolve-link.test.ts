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

describe("resolve links", () => {
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
});
