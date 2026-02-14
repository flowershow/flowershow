import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizePath,
  isWithinRootDir,
  matchesExcludePatterns,
  hasPublishFalse,
  shouldSkipFile,
  validatePublishFrontmatter,
  validateSettings,
} from "./publisherHelpers";
import { IFlowershowSettings } from "src/settings";
import { App, TFile } from "obsidian";

describe("normalizePath", () => {
  describe("without rootDir", () => {
    it("returns path unchanged when no rootDir", () => {
      expect(normalizePath("notes/file.md", "")).toBe("notes/file.md");
    });

    it("removes leading slashes", () => {
      expect(normalizePath("/notes/file.md", "")).toBe("notes/file.md");
      expect(normalizePath("///notes/file.md", "")).toBe("notes/file.md");
    });
  });

  describe("with rootDir", () => {
    it("strips rootDir prefix from path", () => {
      expect(normalizePath("blog/posts/file.md", "blog")).toBe("posts/file.md");
    });

    it("handles rootDir with trailing slash", () => {
      expect(normalizePath("blog/posts/file.md", "blog/")).toBe(
        "posts/file.md",
      );
    });

    it("handles rootDir with leading slash", () => {
      expect(normalizePath("blog/posts/file.md", "/blog")).toBe(
        "posts/file.md",
      );
    });

    it("handles rootDir with both leading and trailing slashes", () => {
      expect(normalizePath("blog/posts/file.md", "/blog/")).toBe(
        "posts/file.md",
      );
    });

    it("does not strip partial matches", () => {
      expect(normalizePath("blog-posts/file.md", "blog")).toBe(
        "blog-posts/file.md",
      );
    });

    it("handles nested rootDir", () => {
      expect(normalizePath("content/blog/posts/file.md", "content/blog")).toBe(
        "posts/file.md",
      );
    });

    it("handles path with leading slash and rootDir", () => {
      expect(normalizePath("/blog/posts/file.md", "blog")).toBe(
        "posts/file.md",
      );
    });

    it("returns path unchanged if not under rootDir", () => {
      expect(normalizePath("other/file.md", "blog")).toBe("other/file.md");
    });
  });
});

describe("isWithinRootDir", () => {
  describe("without rootDir", () => {
    it("returns true for any path when no rootDir set", () => {
      expect(isWithinRootDir("any/path/file.md", "")).toBe(true);
    });
  });

  describe("with rootDir", () => {
    it("returns true for files directly under rootDir", () => {
      expect(isWithinRootDir("blog/file.md", "blog")).toBe(true);
    });

    it("returns true for files in nested folders under rootDir", () => {
      expect(isWithinRootDir("blog/posts/2024/file.md", "blog")).toBe(true);
    });

    it("returns false for files outside rootDir", () => {
      expect(isWithinRootDir("other/file.md", "blog")).toBe(false);
    });

    it("returns false for partial directory name matches", () => {
      expect(isWithinRootDir("blog-archive/file.md", "blog")).toBe(false);
    });

    it("handles rootDir with slashes", () => {
      expect(isWithinRootDir("blog/file.md", "/blog/")).toBe(true);
      expect(isWithinRootDir("blog/file.md", "/blog")).toBe(true);
      expect(isWithinRootDir("blog/file.md", "blog/")).toBe(true);
    });

    it("handles path with leading slash", () => {
      expect(isWithinRootDir("/blog/file.md", "blog")).toBe(true);
    });

    it("handles nested rootDir", () => {
      expect(isWithinRootDir("content/blog/file.md", "content/blog")).toBe(
        true,
      );
      expect(isWithinRootDir("content/other/file.md", "content/blog")).toBe(
        false,
      );
    });
  });
});

describe("matchesExcludePatterns", () => {
  it("returns false when no patterns provided", () => {
    expect(matchesExcludePatterns("file.md", [])).toBe(false);
  });

  it("returns false when patterns is undefined", () => {
    expect(matchesExcludePatterns("file.md", undefined as any)).toBe(false);
  });

  it("matches simple extension pattern", () => {
    expect(matchesExcludePatterns("file.excalidraw", ["\\.excalidraw$"])).toBe(
      true,
    );
    expect(matchesExcludePatterns("file.md", ["\\.excalidraw$"])).toBe(false);
  });

  it("matches directory prefix pattern", () => {
    expect(matchesExcludePatterns("private/secret.md", ["^private/"])).toBe(
      true,
    );
    expect(matchesExcludePatterns("public/file.md", ["^private/"])).toBe(false);
  });

  it("matches filename pattern", () => {
    expect(matchesExcludePatterns("folder/.DS_Store", ["\\.DS_Store$"])).toBe(
      true,
    );
  });

  it("matches complex excalidraw pattern", () => {
    const pattern = "\\.excalidraw(\\.(md|excalidraw))?$";
    expect(matchesExcludePatterns("drawing.excalidraw", [pattern])).toBe(true);
    expect(matchesExcludePatterns("drawing.excalidraw.md", [pattern])).toBe(
      true,
    );
    expect(
      matchesExcludePatterns("drawing.excalidraw.excalidraw", [pattern]),
    ).toBe(true);
    expect(matchesExcludePatterns("drawing.md", [pattern])).toBe(false);
  });

  it("matches if any pattern matches", () => {
    const patterns = ["^private/", "\\.tmp$", "^drafts/"];
    expect(matchesExcludePatterns("private/file.md", patterns)).toBe(true);
    expect(matchesExcludePatterns("cache.tmp", patterns)).toBe(true);
    expect(matchesExcludePatterns("drafts/post.md", patterns)).toBe(true);
    expect(matchesExcludePatterns("public/file.md", patterns)).toBe(false);
  });

  it("handles invalid regex gracefully", () => {
    expect(matchesExcludePatterns("file.md", ["[invalid"])).toBe(false);
  });

  it("handles mixed valid and invalid patterns", () => {
    expect(matchesExcludePatterns("file.tmp", ["[invalid", "\\.tmp$"])).toBe(
      true,
    );
  });
});

describe("hasPublishFalse", () => {
  const createMockFile = (
    path: string,
    extension: string,
    frontmatter?: any,
  ): TFile => {
    return {
      path,
      extension,
    } as TFile;
  };

  const createMockApp = (frontmatter?: any): App => {
    return {
      metadataCache: {
        getCache: vi.fn(() => ({
          frontmatter,
        })),
      },
    } as unknown as App;
  };

  it("returns false for non-markdown files", () => {
    const file = createMockFile("image.png", "png");
    const app = createMockApp();
    expect(hasPublishFalse(file, app)).toBe(false);
  });

  it("returns false for markdown files without publish frontmatter", () => {
    const file = createMockFile("note.md", "md");
    const app = createMockApp({ title: "My Note" });
    expect(hasPublishFalse(file, app)).toBe(false);
  });

  it("returns false when publish is true", () => {
    const file = createMockFile("note.md", "md");
    const app = createMockApp({ publish: true });
    expect(hasPublishFalse(file, app)).toBe(false);
  });

  it("returns true when publish is false", () => {
    const file = createMockFile("note.md", "md");
    const app = createMockApp({ publish: false });
    expect(hasPublishFalse(file, app)).toBe(true);
  });

  it("returns true for mdx files with publish: false", () => {
    const file = createMockFile("note.mdx", "mdx");
    const app = createMockApp({ publish: false });
    expect(hasPublishFalse(file, app)).toBe(true);
  });

  it("returns false when frontmatter is undefined", () => {
    const file = createMockFile("note.md", "md");
    const app = createMockApp(undefined);
    expect(hasPublishFalse(file, app)).toBe(false);
  });
});

describe("shouldSkipFile", () => {
  const createMockFile = (path: string, extension: string = "md"): TFile => {
    return {
      path,
      extension,
    } as TFile;
  };

  const createMockApp = (frontmatter?: any): App => {
    return {
      metadataCache: {
        getCache: vi.fn(() => ({
          frontmatter,
        })),
      },
    } as unknown as App;
  };

  it("skips files outside rootDir", () => {
    const file = createMockFile("other/file.md");
    const app = createMockApp();
    expect(shouldSkipFile(file, app, "blog", [])).toBe(true);
  });

  it("does not skip files inside rootDir with no patterns or publish: false", () => {
    const file = createMockFile("blog/file.md");
    const app = createMockApp();
    expect(shouldSkipFile(file, app, "blog", [])).toBe(false);
  });

  it("skips files matching exclude patterns within rootDir", () => {
    const file = createMockFile("blog/file.excalidraw", "excalidraw");
    const app = createMockApp();
    expect(shouldSkipFile(file, app, "blog", ["\\.excalidraw$"])).toBe(true);
  });

  it("does not skip files not matching patterns within rootDir", () => {
    const file = createMockFile("blog/file.md");
    const app = createMockApp();
    expect(shouldSkipFile(file, app, "blog", ["\\.excalidraw$"])).toBe(false);
  });

  it("skips based on rootDir first, then patterns", () => {
    const file = createMockFile("other/file.excalidraw", "excalidraw");
    const app = createMockApp();
    expect(shouldSkipFile(file, app, "blog", ["\\.excalidraw$"])).toBe(true);
  });

  it("handles empty rootDir with exclude patterns", () => {
    const file1 = createMockFile("private/file.md");
    const file2 = createMockFile("public/file.md");
    const app = createMockApp();
    expect(shouldSkipFile(file1, app, "", ["^private/"])).toBe(true);
    expect(shouldSkipFile(file2, app, "", ["^private/"])).toBe(false);
  });

  it("combines rootDir filtering with multiple patterns", () => {
    const patterns = ["\\.excalidraw$", "^blog/drafts/", "\\.tmp$"];
    const app = createMockApp();

    // Inside rootDir, matches pattern
    const file1 = createMockFile("blog/drafts/post.md");
    expect(shouldSkipFile(file1, app, "blog", patterns)).toBe(true);

    // Inside rootDir, no pattern match
    const file2 = createMockFile("blog/posts/file.md");
    expect(shouldSkipFile(file2, app, "blog", patterns)).toBe(false);

    // Outside rootDir
    const file3 = createMockFile("other/file.md");
    expect(shouldSkipFile(file3, app, "blog", patterns)).toBe(true);
  });

  it("skips files with publish: false in frontmatter", () => {
    const file = createMockFile("blog/secret.md");
    const app = createMockApp({ publish: false });
    expect(shouldSkipFile(file, app, "blog", [])).toBe(true);
  });

  it("does not skip files with publish: true in frontmatter", () => {
    const file = createMockFile("blog/public.md");
    const app = createMockApp({ publish: true });
    expect(shouldSkipFile(file, app, "blog", [])).toBe(false);
  });

  it("skips files that match patterns even if publish is true", () => {
    const file = createMockFile("blog/file.excalidraw", "excalidraw");
    const app = createMockApp({ publish: true });
    expect(shouldSkipFile(file, app, "blog", ["\\.excalidraw$"])).toBe(true);
  });

  it("skips files outside rootDir even if publish is true", () => {
    const file = createMockFile("other/file.md");
    const app = createMockApp({ publish: true });
    expect(shouldSkipFile(file, app, "blog", [])).toBe(true);
  });
});

describe("validatePublishFrontmatter", () => {
  it("returns true when publish is not set", () => {
    const frontmatter = { title: "My Note" } as any;
    expect(validatePublishFrontmatter(frontmatter)).toBe(true);
  });

  it("returns true when publish is true", () => {
    const frontmatter = { publish: true } as any;
    expect(validatePublishFrontmatter(frontmatter)).toBe(true);
  });

  it("returns false when publish is false", () => {
    const frontmatter = { publish: false } as any;
    expect(validatePublishFrontmatter(frontmatter)).toBe(false);
  });

  it("returns true when publish is a string (not boolean false)", () => {
    const frontmatter = { publish: "false" } as any;
    expect(validatePublishFrontmatter(frontmatter)).toBe(true);
  });

  it("returns true when frontmatter is empty", () => {
    const frontmatter = {} as any;
    expect(validatePublishFrontmatter(frontmatter)).toBe(true);
  });
});

describe("validateSettings", () => {
  it("returns true for valid settings", () => {
    const settings: IFlowershowSettings = {
      flowershowToken: "fs_pat_abc123",
      siteName: "my-site",
      rootDir: "",
      excludePatterns: [],
      lastSeenVersion: "",
    };
    expect(validateSettings(settings)).toBe(true);
  });

  it("returns false when token is missing", () => {
    const settings: IFlowershowSettings = {
      flowershowToken: "",
      siteName: "my-site",
      rootDir: "",
      excludePatterns: [],
      lastSeenVersion: "",
    };
    expect(validateSettings(settings)).toBe(false);
  });

  it("returns false when siteName is missing", () => {
    const settings: IFlowershowSettings = {
      flowershowToken: "fs_pat_abc123",
      siteName: "",
      rootDir: "",
      excludePatterns: [],
      lastSeenVersion: "",
    };
    expect(validateSettings(settings)).toBe(false);
  });

  it("returns false when token format is invalid", () => {
    const settings: IFlowershowSettings = {
      flowershowToken: "invalid_token",
      siteName: "my-site",
      rootDir: "",
      excludePatterns: [],
      lastSeenVersion: "",
    };
    expect(validateSettings(settings)).toBe(false);
  });

  it("returns false when token does not start with fs_pat_", () => {
    const settings: IFlowershowSettings = {
      flowershowToken: "pat_abc123",
      siteName: "my-site",
      rootDir: "",
      excludePatterns: [],
      lastSeenVersion: "",
    };
    expect(validateSettings(settings)).toBe(false);
  });

  it("returns true when token starts with fs_pat_ and has content after", () => {
    const settings: IFlowershowSettings = {
      flowershowToken: "fs_pat_",
      siteName: "my-site",
      rootDir: "",
      excludePatterns: [],
      lastSeenVersion: "",
    };
    expect(validateSettings(settings)).toBe(true);
  });

  it("validates token format before checking siteName", () => {
    // Token is checked first, even if siteName is valid
    const settings: IFlowershowSettings = {
      flowershowToken: "invalid",
      siteName: "my-site",
      rootDir: "",
      excludePatterns: [],
      lastSeenVersion: "",
    };
    expect(validateSettings(settings)).toBe(false);
  });

  it("returns true with optional fields populated", () => {
    const settings: IFlowershowSettings = {
      flowershowToken: "fs_pat_abc123xyz",
      siteName: "my-blog",
      rootDir: "content",
      excludePatterns: ["^private/", "\\.tmp$"],
      lastSeenVersion: "4.0.0",
    };
    expect(validateSettings(settings)).toBe(true);
  });
});
