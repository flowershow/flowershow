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
import { resolveSiteAlias } from "./resolve-site-alias";

describe("resolve special site alias to origin", () => {
  test("/blog", () => {
    const s = "/blog";
    const expected = `/@olayway/blog`;
    const resolved = resolveSiteAlias(s, "from");
    expect(resolved).toBe(expected);
  });

  test("/docs", () => {
    const s = "/docs";
    const expected = `/@olayway/docs`;
    const resolved = resolveSiteAlias(s, "from");
    expect(resolved).toBe(expected);
  });

  test("/collections", () => {
    const s = "/collections";
    const expected = `/@olayway/collections`;
    const resolved = resolveSiteAlias(s, "from");
    expect(resolved).toBe(expected);
  });

  test("/notes", () => {
    const s = "/notes";
    const expected = `/@rufuspollock/data-notes`;
    const resolved = resolveSiteAlias(s, "from");
    expect(resolved).toBe(expected);
  });

  test("/core", () => {
    const s = "/core/co2-ppm";
    const expected = `/@olayway/co2-ppm`;
    const resolved = resolveSiteAlias(s, "from");
    expect(resolved).toBe(expected);
  });
});

describe("resolve special site origin to alias", () => {
  test("/blog", () => {
    const s = `/@olayway/blog`;
    const expected = "/blog";
    const resolved = resolveSiteAlias(s, "to");
    expect(resolved).toBe(expected);
  });

  test("/core", () => {
    const s = `/@olayway/co2-ppm`;
    const expected = "/core/co2-ppm";
    const resolved = resolveSiteAlias(s, "to");
    expect(resolved).toBe(expected);
  });
});
