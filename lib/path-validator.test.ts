import { describe, it, expect } from "vitest";
import { isPathVisible } from "./path-validator";

describe("isPathVisible", () => {
  it("should always allow config.json regardless of includes/excludes", () => {
    expect(isPathVisible("config.json", [], [])).toBe(true);
    expect(isPathVisible("/config.json", [], [])).toBe(true);
    expect(isPathVisible("config.json", [], ["/config.json"])).toBe(true);
    expect(isPathVisible("/config.json", [], ["/config.json"])).toBe(true);
  });

  it("should always allow custom.css regardless of includes/excludes", () => {
    expect(isPathVisible("custom.css", [], [])).toBe(true);
    expect(isPathVisible("/custom.css", [], [])).toBe(true);
    expect(isPathVisible("custom.css", [], ["/custom.css"])).toBe(true);
    expect(isPathVisible("/custom.css", [], ["/custom.css"])).toBe(true);
  });

  it("should handle regular paths normally", () => {
    expect(isPathVisible("/blog/post.md", ["/blog"], [])).toBe(true);
    expect(isPathVisible("/blog/post.md", [], ["/blog"])).toBe(false);
    expect(isPathVisible("/docs/guide.md", ["/blog"], [])).toBe(false);
    expect(isPathVisible("/docs/guide.md", [], [])).toBe(true);
  });
});
