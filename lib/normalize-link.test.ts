import "@testing-library/jest-dom";
import { normalizeLink } from "./normalize-link";

describe("normalizeLink on root README/index pages", () => {
  const filePath = "README.md";
  const urlBase = "/@username/abc";

  it("resolves absolute links", () => {
    const link = "/x/y/x";
    const resolved = normalizeLink(link, urlBase, filePath);
    expect(resolved).toBe("/@username/abc/x/y/x");
  });

  it("resolves relative links", () => {
    const link = "x/y/x";
    const resolved = normalizeLink(link, urlBase, filePath);
    expect(resolved).toBe("/@username/abc/x/y/x");
  });

  it("resolves relative links with ./", () => {
    const link = "./x/y/x";
    const resolved = normalizeLink(link, urlBase, filePath);
    expect(resolved).toBe("/@username/abc/x/y/x");
  });
});

describe("normalizeLink on nested README/index pages", () => {
  const filePath = "blog/README.md";
  const urlBase = "/@username/abc";

  it("resolves absolute links", () => {
    const link = "/x/y/x";
    const resolved = normalizeLink(link, urlBase, filePath);
    expect(resolved).toBe("/@username/abc/x/y/x");
  });

  it("resolves relative links", () => {
    const link = "x/y/x";
    const resolved = normalizeLink(link, urlBase, filePath);
    expect(resolved).toBe("/@username/abc/blog/x/y/x");
  });

  it("resolves relative links with ./", () => {
    const link = "./x/y/x";
    const resolved = normalizeLink(link, urlBase, filePath);
    expect(resolved).toBe("/@username/abc/blog/x/y/x");
  });

  it("resolves relative links with ../", () => {
    const link = "../x/y/x";
    const resolved = normalizeLink(link, urlBase, filePath);
    expect(resolved).toBe("/@username/abc/x/y/x");
  });
});
