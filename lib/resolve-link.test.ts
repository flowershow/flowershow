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
  const prefixPath = "/@username/abc"; // this could also be url to R2 bucket site folder
  const filePath = "/blog/README.md";

  test("external link", () => {
    const link = "https://example.com";
    const resolved = resolveLinkToUrl({ link, filePath });
    expect(resolved).toBe(link);
  });

  test("absolute link", () => {
    const link = "/blog/post-1";
    const expected = `${prefixPath}/blog/post-1`;
    const resolved = resolveLinkToUrl({ link, filePath, prefixPath });
    expect(resolved).toBe(expected);
  });

  test("link to home page", () => {
    const link = "/";
    const expected = `${prefixPath}`;
    const resolved = resolveLinkToUrl({ link, filePath, prefixPath });
    expect(resolved).toBe(expected);
  });

  test("link ending with README", () => {
    const link = "/README";
    const expected = `${prefixPath}`;
    const resolved = resolveLinkToUrl({ link, filePath, prefixPath });
    expect(resolved).toBe(expected);
  });

  test("link ending with .md extension", () => {
    const link = "post-2.md";
    const expected = `${prefixPath}/blog/post-2`;
    const resolved = resolveLinkToUrl({ link, filePath, prefixPath });
    expect(resolved).toBe(expected);
  });

  test("link with no prefix", () => {
    const link = "post-2";
    const expected = `/blog/post-2`;
    const resolved = resolveLinkToUrl({ link, filePath });
    expect(resolved).toBe(expected);
  });

  describe("relative links", () => {
    test("same directory, no dot", () => {
      const link = "post-1";
      const expected = `${prefixPath}/blog/post-1`;
      const resolved = resolveLinkToUrl({ link, filePath, prefixPath });
      expect(resolved).toBe(expected);
    });

    test("same directory, with dot", () => {
      const link = "./post-1";
      const expected = `${prefixPath}/blog/post-1`;
      const resolved = resolveLinkToUrl({ link, filePath, prefixPath });
      expect(resolved).toBe(expected);
    });

    test("up a directory", () => {
      const link = "../about";
      const expected = `${prefixPath}/about`;
      const resolved = resolveLinkToUrl({ link, filePath, prefixPath });
      expect(resolved).toBe(expected);
    });

    test("to sibling directory", () => {
      const link = "../projects/project-1";
      const expected = `${prefixPath}/projects/project-1`;
      const resolved = resolveLinkToUrl({ link, filePath, prefixPath });
      expect(resolved).toBe(expected);
    });
  });
});
