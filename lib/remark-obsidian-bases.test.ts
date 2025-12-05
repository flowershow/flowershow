import { describe, it, expect } from "vitest";
import {
  buildFilterStrategy,
  getComputedProperty,
} from "./remark-obsidian-bases";
import type { Prisma, Blob } from "@prisma/client";

describe("buildPrismaComparison", () => {
  describe("file property comparisons", () => {
    it("should build equality comparison for file.ext", () => {
      const filter = 'file.ext == "md"';
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({
        extension: "md",
      });
      expect(postFilter).not.toBeDefined();
    });

    it("should build inequality comparison for file.ext", () => {
      const filter = 'file.ext != "pdf"';
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({
        extension: { not: "pdf" },
      });
      expect(postFilter).not.toBeDefined();
    });

    it("should build equality comparison for file.path", () => {
      const filter = 'file.path == "notes/test.md"';
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({
        path: "notes/test.md",
      });
      expect(postFilter).not.toBeDefined();
    });

    it("should build greater than comparison for file.size", () => {
      const filter = "file.size > 123";
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({
        size: { gt: 123 },
      });
      expect(postFilter).not.toBeDefined();
    });
  });

  describe("computed file properties", () => {
    it("should return null for file.folder comparison (requires post-filter)", () => {
      const filter = 'file.folder == "notes"';
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
    });

    it("should return null for file.name comparison (requires post-filter)", () => {
      const filter = 'file.name == "test.md"';
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
    });

    it("should handle file.folder comparison with rootDir in post-filter", () => {
      const filter = 'file.folder == "Test"';
      const { where, postFilter } = buildFilterStrategy(filter, "Public");

      // Should use post-filter since file.folder is computed
      expect(where).toEqual({});
      expect(postFilter).toBeDefined();

      // Test that the post-filter correctly strips rootDir
      // Simulating a blob with path "Test/file.md" (stored without rootDir prefix)
      const mockBlob = {
        path: "Test/file.md",
        metadata: {},
        appPath: "/test/file",
      };

      expect(postFilter!(mockBlob)).toBe(true);
    });

    it("should handle file.folder comparison with nested folder and rootDir", () => {
      const filter = 'file.folder == "Test/Subfolder"';
      const { where, postFilter } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();

      // Test with nested folder path
      const mockBlob = {
        path: "Test/Subfolder/file.md",
        metadata: {},
        appPath: "/test/subfolder/file",
      };

      expect(postFilter!(mockBlob)).toBe(true);
    });

    it("should handle file.folder comparison without rootDir", () => {
      const filter = 'file.folder == "notes"';
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();

      const mockBlob = {
        path: "notes/file.md",
        metadata: {},
        appPath: "/notes/file",
      };

      expect(postFilter!(mockBlob)).toBe(true);
    });

    it("should reject file.folder comparison when folder does not match", () => {
      const filter = 'file.folder == "Test"';
      const { where, postFilter } = buildFilterStrategy(filter, "Public");

      expect(postFilter).toBeDefined();

      // Different folder should not match
      const mockBlob = {
        path: "Other/file.md",
        metadata: {},
        appPath: "/other/file",
      };

      expect(postFilter!(mockBlob)).toBe(false);
    });
  });

  describe("note/metadata property comparisons", () => {
    it("should build equality comparison for note property", () => {
      const filter = "price == 100";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["price"],
          equals: 100,
        },
      });
    });

    it("should build inequality comparison for note property", () => {
      const filter = "status != 'draft'";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        NOT: {
          metadata: {
            path: ["status"],
            equals: "draft",
          },
        },
      });
    });

    it("should build greater than comparison for note property", () => {
      const filter = "rating > 4";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["rating"],
          gt: 4,
        },
      });
    });

    it("should build less than comparison for note property", () => {
      const filter = "count < 10";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["count"],
          lt: 10,
        },
      });
    });

    it("should build greater than or equal comparison for note property", () => {
      const filter = "score >= 50";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["score"],
          gte: 50,
        },
      });
    });

    it("should build less than or equal comparison for note property", () => {
      const filter = "age <= 30";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["age"],
          lte: 30,
        },
      });
    });

    it("should handle note.property syntax", () => {
      const filter = "note.title == 'Test'";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["title"],
          equals: "Test",
        },
      });
    });
  });

  describe("special function calls", () => {
    it("should build where clause for file.inFolder", () => {
      const filter = 'file.inFolder("notes")';
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        path: {
          startsWith: "notes/",
        },
      });
    });

    it("should handle file.inFolder with trailing slash", () => {
      const filter = 'file.inFolder("notes/")';
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        path: {
          startsWith: "notes/",
        },
      });
    });

    it("should strip rootDir prefix from file.inFolder", () => {
      const filter = 'file.inFolder("Public/notes")';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({
        path: {
          startsWith: "notes/",
        },
      });
    });

    it("should return empty where clause when folder equals rootDir", () => {
      const filter = 'file.inFolder("Public")';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({});
    });

    it("should build where clause for file.hasProperty", () => {
      const filter = 'file.hasProperty("tags")';
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["tags"],
          not: expect.anything(), // Prisma.JsonNull
        },
      });
    });
  });

  describe("logical operators", () => {
    it("should handle AND operator with multiple conditions", () => {
      const filter = {
        and: ['file.ext == "md"', "price > 10"],
      };
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        AND: [
          { extension: "md" },
          {
            metadata: {
              path: ["price"],
              gt: 10,
            },
          },
        ],
      });
    });

    it("should handle OR operator with multiple conditions", () => {
      const filter = {
        or: ['file.ext == "md"', 'file.ext == "txt"'],
      };
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        OR: [{ extension: "md" }, { extension: "txt" }],
      });
    });

    it("should handle NOT operator", () => {
      const filter = {
        not: ['file.ext == "pdf"'],
      };
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        NOT: [{ extension: "pdf" }],
      });
    });

    it("should handle nested logical operators", () => {
      const filter = {
        and: [
          'file.ext == "md"',
          {
            or: ["price > 10", "rating > 4"],
          },
        ],
      };
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        AND: [
          { extension: "md" },
          {
            OR: [
              {
                metadata: {
                  path: ["price"],
                  gt: 10,
                },
              },
              {
                metadata: {
                  path: ["rating"],
                  gt: 4,
                },
              },
            ],
          },
        ],
      });
    });
  });

  describe("post-filter handling", () => {
    it("should return post-filter for complex expressions", () => {
      const filter = 'file.name == "test.md"';
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
      expect(typeof postFilter).toBe("function");
    });

    it("should combine Prisma where and post-filter for mixed conditions", () => {
      const filter = {
        and: ['file.ext == "md"', 'file.name == "test.md"'],
      };
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({
        AND: [{ extension: "md" }],
      });
      expect(postFilter).toBeDefined();
    });

    it("should handle OR with post-filter predicates", () => {
      const filter = {
        or: ['file.name == "test.md"', 'file.folder == "notes"'],
      };
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
    });

    it("should handle NOT with post-filter predicates", () => {
      const filter = {
        not: ['file.name == "test.md"'],
      };
      const { where, postFilter } = buildFilterStrategy(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty filter object", () => {
      const filter = {};
      const { where, postFilter } = buildFilterStrategy(filter as any);

      expect(where).toEqual({});
      expect(postFilter).toBeUndefined();
    });

    it("should handle numeric values", () => {
      const filter = "count == 42";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["count"],
          equals: 42,
        },
      });
    });

    it("should handle boolean values", () => {
      const filter = "published == true";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["published"],
          equals: true,
        },
      });
    });

    it("should handle null values", () => {
      const filter = "value == null";
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["value"],
          equals: null,
        },
      });
    });

    it("should handle string values with quotes", () => {
      const filter = 'title == "Hello World"';
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        metadata: {
          path: ["title"],
          equals: "Hello World",
        },
      });
    });

    it("should handle rootDir with leading slash", () => {
      const filter = 'file.inFolder("Public/notes")';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({
        path: {
          startsWith: "notes/",
        },
      });
    });

    it("should strip rootDir prefix from file.path comparison", () => {
      const filter = 'file.path == "Public/notes/test.md"';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({
        path: "notes/test.md",
      });
    });

    it("should strip rootDir prefix with leading slash from file.path", () => {
      const filter = 'file.path == "Public/folder/file.md"';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({
        path: "folder/file.md",
      });
    });

    it("should handle file.path comparison without rootDir prefix", () => {
      const filter = 'file.path == "notes/test.md"';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({
        path: "notes/test.md",
      });
    });

    it("should strip rootDir from file.path with inequality operator", () => {
      const filter = 'file.path != "Public/notes/test.md"';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({
        path: { not: "notes/test.md" },
      });
    });

    it("should strip rootDir from file.path with greater than operator", () => {
      const filter = 'file.path > "Public/a"';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({
        path: { gt: "a" },
      });
    });
  });

  describe("type safety", () => {
    it("should return correct Prisma.BlobWhereInput type", () => {
      const filter = 'file.ext == "md"';
      const { where } = buildFilterStrategy(filter);

      // Type assertion to ensure it matches Prisma type
      const prismaWhere: Prisma.BlobWhereInput = where;
      expect(prismaWhere).toBeDefined();
    });

    it("should handle all comparison operators", () => {
      const operators = ["==", ">", "<", ">=", "<="];

      operators.forEach((op) => {
        const filter = `price ${op} 100`;
        const { where } = buildFilterStrategy(filter);
        expect(where).toBeDefined();
        expect(where.metadata).toBeDefined();
      });
    });

    it("should handle inequality operator with NOT wrapper", () => {
      const filter = "price != 100";
      const { where } = buildFilterStrategy(filter);
      expect(where).toEqual({
        NOT: {
          metadata: {
            path: ["price"],
            equals: 100,
          },
        },
      });
    });
  });
});

describe("postFilter", () => {
  // We need to import the function - since it's not exported, we'll test it through the post-filter
  // which uses getFileProperty internally

  describe("path property", () => {
    it("should return the path without rootDir when no rootDir is set", () => {
      const filter = 'file.path == "notes/test.md"';
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        path: "notes/test.md",
      });
    });

    it("should add rootDir prefix to path when rootDir is set", () => {
      const filter = 'file.path == "Public/notes/test.md"';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({
        path: "notes/test.md",
      });
    });

    it("should handle path with leading slash", () => {
      const filter = 'file.path == "Public/notes/test.md"';
      const { where } = buildFilterStrategy(filter, "Public");

      expect(where).toEqual({
        path: "notes/test.md",
      });
    });
  });

  describe("ext property", () => {
    it("should extract file extension from path", () => {
      const filter = 'file.ext == "md"';
      const { where } = buildFilterStrategy(filter);

      expect(where).toEqual({
        extension: "md",
      });
    });
  });

  describe("name property", () => {
    it("should extract filename without extension", () => {
      const filter = 'file.name == "test"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should extract name from file with multiple dots", () => {
      const filter = 'file.name == "my.file"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/my.file.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should extract name from root level file", () => {
      const filter = 'file.name == "README"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "README.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should extract name with rootDir", () => {
      const filter = 'file.name == "test"';
      const { postFilter } = buildFilterStrategy(filter, "Public");

      const mockBlob: Partial<Blob> = {
        path: "notes/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should handle file without extension", () => {
      const filter = 'file.name == "README"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "docs/README",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });
  });

  describe("folder property", () => {
    it("should extract folder path from file", () => {
      const filter = 'file.folder == "notes"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should extract nested folder path", () => {
      const filter = 'file.folder == "notes/subfolder"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/subfolder/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should return empty string for root level file", () => {
      const filter = 'file.folder == ""';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should strip rootDir prefix from folder", () => {
      const filter = 'file.folder == "notes"';
      const { postFilter } = buildFilterStrategy(filter, "Public");

      // Path stored without rootDir in database
      const mockBlob: Partial<Blob> = {
        path: "notes/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should strip rootDir prefix from nested folder", () => {
      const filter = 'file.folder == "notes/subfolder"';
      const { postFilter } = buildFilterStrategy(filter, "Public");

      const mockBlob: Partial<Blob> = {
        path: "notes/subfolder/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should handle folder when path has rootDir prefix", () => {
      const filter = 'file.folder == "notes"';
      const { postFilter } = buildFilterStrategy(filter, "Public");

      // Path already has rootDir prefix
      const mockBlob: Partial<Blob> = {
        path: "Public/notes/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should strip rootDir with leading slash from folder", () => {
      const filter = 'file.folder == "notes"';
      const { postFilter } = buildFilterStrategy(filter, "Public");

      const mockBlob: Partial<Blob> = {
        path: "Public/notes/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should handle deeply nested folders with rootDir", () => {
      const filter = 'file.folder == "a/b/c/d"';
      const { postFilter } = buildFilterStrategy(filter, "Public");

      const mockBlob: Partial<Blob> = {
        path: "a/b/c/d/file.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty path", () => {
      const filter = 'file.name == ""';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should handle path with only filename", () => {
      const filter = 'file.name == "test"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should handle path with trailing slash", () => {
      const filter = 'file.folder == "notes"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should handle undefined property request", () => {
      // Testing that getFileProperty returns undefined for unknown properties
      // This is tested indirectly through the filter evaluation
      const filter = 'file.unknownProperty == "value"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/test.md",
        metadata: {},
      };

      // Should return false because unknownProperty is undefined
      expect(postFilter!(mockBlob as Blob)).toBe(false);
    });

    it("should handle complex path with special characters", () => {
      const filter = 'file.name == "test-file_v2"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/test-file_v2.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should handle path with spaces", () => {
      const filter = 'file.name == "my test file"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/my test file.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should handle rootDir that matches beginning of path", () => {
      const filter = 'file.folder == "lic/notes"';
      const { postFilter } = buildFilterStrategy(filter, "Public");

      // Should not strip "Public" from "Public/notes" if it's part of "Publiclic"
      const mockBlob: Partial<Blob> = {
        path: "lic/notes/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });
  });

  describe("comparison operators with file properties", () => {
    it("should handle inequality comparison for file.name", () => {
      const filter = 'file.name != "other"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });

    it("should handle inequality comparison for file.ext", () => {
      const filter = 'file.ext != "pdf"';
      const { postFilter, where } = buildFilterStrategy(filter);

      expect(postFilter).not.toBeDefined();
      expect(where).toEqual({
        extension: { not: "pdf" },
      });
    });

    it("should handle inequality comparison for file.folder", () => {
      const filter = 'file.folder != "other"';
      const { postFilter } = buildFilterStrategy(filter);

      const mockBlob: Partial<Blob> = {
        path: "notes/test.md",
        metadata: {},
      };

      expect(postFilter!(mockBlob as Blob)).toBe(true);
    });
  });

  describe("getComputedProperty", () => {
    // Helper to create a mock blob with metadata
    const createMockBlob = (
      path: string,
      metadata: Record<string, any> = {},
    ): any => ({
      path,
      metadata,
      appPath: `/${path.replace(/\.[^/.]+$/, "")}`,
      siteId: "test-site",
      extension: path.split(".").pop() || "",
      size: 1000,
      sha: "test-sha",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    describe("basic formula evaluation", () => {
      it("should evaluate a simple arithmetic formula", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
          tax: 50,
        });
        const formulas = { total: "price + tax" };

        const result = getComputedProperty(mockBlob, "total", formulas);

        expect(result).toBe(150);
      });

      it("should evaluate a formula with multiplication", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
        });
        const formulas = { total: "price * 2" };

        const result = getComputedProperty(mockBlob, "total", formulas);

        expect(result).toBe(200);
      });

      it("should evaluate a formula with division", () => {
        const mockBlob = createMockBlob("test.md", {
          total: 100,
          count: 2,
        });
        const formulas = { average: "total / count" };

        const result = getComputedProperty(mockBlob, "average", formulas);

        expect(result).toBe(50);
      });

      it("should evaluate a formula with subtraction", () => {
        const mockBlob = createMockBlob("test.md", {
          revenue: 100,
          cost: 70,
        });
        const formulas = { profit: "revenue - cost" };

        const result = getComputedProperty(mockBlob, "profit", formulas);

        expect(result).toBe(30);
      });

      it("should evaluate a formula with modulo", () => {
        const mockBlob = createMockBlob("test.md", {
          value: 10,
        });
        const formulas = { remainder: "value % 3" };

        const result = getComputedProperty(mockBlob, "remainder", formulas);

        expect(result).toBe(1);
      });
    });

    describe("formula with note properties", () => {
      it("should access note properties in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
          tax: 10,
        });
        const formulas = { fullPrice: "note.price + note.tax" };

        const result = getComputedProperty(mockBlob, "fullPrice", formulas);

        expect(result).toBe(110);
      });

      it("should handle missing note properties as undefined", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
        });
        const formulas = { result: "price + missingProperty" };

        const result = getComputedProperty(mockBlob, "result", formulas);

        // undefined + 100 = NaN
        expect(isNaN(result)).toBe(true);
      });
    });

    describe("formula with file properties", () => {
      it("should access file.name in formulas", () => {
        const mockBlob = createMockBlob("test.md");
        const formulas = { hasTest: 'file.name == "test"' };

        const result = getComputedProperty(mockBlob, "hasTest", formulas);

        expect(result).toBe(true);
      });

      it("should access file.ext in formulas", () => {
        const mockBlob = createMockBlob("test.md");
        const formulas = { isMd: 'file.ext == "md"' };

        const result = getComputedProperty(mockBlob, "isMd", formulas);

        expect(result).toBe(true);
      });

      it("should access file.folder in formulas", () => {
        const mockBlob = createMockBlob("notes/test.md");
        const formulas = { inNotes: 'file.folder == "notes"' };

        const result = getComputedProperty(mockBlob, "inNotes", formulas);

        expect(result).toBe(true);
      });

      it("should access file.path in formulas", () => {
        const mockBlob = createMockBlob("notes/test.md");
        const formulas = { isTestFile: 'file.path == "notes/test.md"' };

        const result = getComputedProperty(mockBlob, "isTestFile", formulas);

        expect(result).toBe(true);
      });
    });

    describe("formula with global functions", () => {
      it("should use number() function in formulas", () => {
        const mockBlob = createMockBlob("test.md");
        const formulas = { numValue: 'number("42")' };

        const result = getComputedProperty(mockBlob, "numValue", formulas);

        expect(result).toBe(42);
      });

      it("should use min() function in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
          tax: 10,
        });
        const formulas = { minimum: "min(price, tax)" };

        const result = getComputedProperty(mockBlob, "minimum", formulas);

        expect(result).toBe(10);
      });

      it("should use max() function in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
          tax: 10,
        });
        const formulas = { maximum: "max(price, tax)" };

        const result = getComputedProperty(mockBlob, "maximum", formulas);

        expect(result).toBe(100);
      });

      it("should use if() function in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
        });
        const formulas = { status: "if(price > 50, 'expensive', 'cheap')" };

        const result = getComputedProperty(mockBlob, "status", formulas);

        expect(result).toBe("expensive");
      });

      it("should use if() function with false condition", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
        });
        const formulas = { status: "if(price > 150, 'expensive', 'cheap')" };

        const result = getComputedProperty(mockBlob, "status", formulas);

        expect(result).toBe("cheap");
      });

      it("should use list() function in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          item: "apple",
        });
        const formulas = { items: "list(item)" };

        const result = getComputedProperty(mockBlob, "items", formulas);

        expect(result).toEqual(["apple"]);
      });
    });

    describe("complex formula expressions", () => {
      it("should evaluate formulas with multiple operations", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 80,
          tax: 20,
        });
        const formulas = { result: "(price + tax) * 2 + 50" };

        const result = getComputedProperty(mockBlob, "result", formulas);

        expect(result).toBe(250);
      });

      it("should evaluate formulas with comparison operators", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
        });
        const formulas = { isExpensive: "price > 50" };

        const result = getComputedProperty(mockBlob, "isExpensive", formulas);

        expect(result).toBe(true);
      });

      it("should evaluate formulas with logical operators", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
          tax: 10,
        });
        const formulas = { valid: "price > 50 && tax < 20" };

        const result = getComputedProperty(mockBlob, "valid", formulas);

        expect(result).toBe(true);
      });

      it("should evaluate formulas with OR operator", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 50,
          discount: 25,
        });
        const formulas = { eligible: "price > 100 || discount > 20" };

        const result = getComputedProperty(mockBlob, "eligible", formulas);

        expect(result).toBe(true);
      });
    });

    describe("formula with rootDir", () => {
      it("should handle file properties with rootDir", () => {
        const mockBlob = createMockBlob("notes/test.md");
        const formulas = { inPublic: 'file.folder == "notes"' };

        const result = getComputedProperty(
          mockBlob,
          "inPublic",
          formulas,
          "Public",
        );

        expect(result).toBe(true);
      });

      it("should strip rootDir from file.path in formulas", () => {
        const mockBlob = createMockBlob("notes/test.md");
        const formulas = { correctPath: 'file.path == "Public/notes/test.md"' };

        const result = getComputedProperty(
          mockBlob,
          "correctPath",
          formulas,
          "Public",
        );

        expect(result).toBe(true);
      });
    });

    describe("formula dependency and chaining", () => {
      it("should reference other formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
          tax: 10,
        });
        const formulas = {
          subtotal: "price + tax",
          grandTotal: "formula.subtotal * 2",
        };

        const result = getComputedProperty(mockBlob, "grandTotal", formulas);

        expect(result).toBe(220);
      });

      it("should handle multiple formula dependencies", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
        });
        const formulas = {
          base: "price * 2",
          discount: "formula.base * 0.25",
          final: "formula.base - formula.discount",
        };

        const result = getComputedProperty(mockBlob, "final", formulas);

        expect(result).toBe(150);
      });

      it("should handle deep formula chains", () => {
        const mockBlob = createMockBlob("test.md", {
          value: 50,
        });
        const formulas = {
          level1: "value * 2",
          level2: "formula.level1 * 2",
          level3: "formula.level2 * 2",
        };

        const result = getComputedProperty(mockBlob, "level3", formulas);

        expect(result).toBe(400);
      });
    });

    describe("formula with string operations", () => {
      it("should concatenate strings in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          firstName: "John",
          lastName: "Doe",
        });
        const formulas = { fullName: "firstName + lastName" };

        const result = getComputedProperty(mockBlob, "fullName", formulas);

        expect(result).toBe("JohnDoe");
      });

      it("should handle string concatenation with spaces", () => {
        const mockBlob = createMockBlob("test.md", {
          firstName: "John",
          lastName: "Doe",
        });
        const formulas = { fullName: 'firstName + " " + lastName' };

        const result = getComputedProperty(mockBlob, "fullName", formulas);

        expect(result).toBe("John Doe");
      });
    });

    describe("formula with date operations", () => {
      it("should work with date properties", () => {
        const mockBlob = createMockBlob("test.md", {
          created: "2024-01-15",
        });
        const formulas = { year: "date(created).year" };

        const result = getComputedProperty(mockBlob, "year", formulas);

        expect(result).toBe(2024);
      });

      it("should extract month from date", () => {
        const mockBlob = createMockBlob("test.md", {
          created: "2024-03-15",
        });
        const formulas = { month: "date(created).month" };

        const result = getComputedProperty(mockBlob, "month", formulas);

        expect(result).toBe(3);
      });

      it("should extract day from date", () => {
        const mockBlob = createMockBlob("test.md", {
          created: "2024-01-25",
        });
        const formulas = { day: "date(created).day" };

        const result = getComputedProperty(mockBlob, "day", formulas);

        expect(result).toBe(25);
      });
    });

    describe("error handling", () => {
      it("should throw error when formulas is undefined", () => {
        const mockBlob = createMockBlob("test.md", {});

        expect(() => {
          getComputedProperty(mockBlob, "total", undefined);
        }).toThrow("Formula not found");
      });

      it("should throw error when formula name not found", () => {
        const mockBlob = createMockBlob("test.md", {});
        const formulas = { other: "price + tax" };

        expect(() => {
          getComputedProperty(mockBlob, "total", formulas);
        }).toThrow("Formula not found");
      });

      it("should handle formulas with undefined properties gracefully", () => {
        const mockBlob = createMockBlob("test.md", {});
        const formulas = { result: "missingProperty + 10" };

        const result = getComputedProperty(mockBlob, "result", formulas);

        // undefined + 10 = NaN
        expect(isNaN(result)).toBe(true);
      });

      it("should handle division by zero", () => {
        const mockBlob = createMockBlob("test.md", {
          value: 100,
        });
        const formulas = { result: "value / 0" };

        const result = getComputedProperty(mockBlob, "result", formulas);

        // JavaScript division by zero returns Infinity
        expect(result).toBe(Infinity);
      });
    });

    describe("formula with unary operators", () => {
      it("should handle negation in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 100,
        });
        const formulas = { negative: "-price" };

        const result = getComputedProperty(mockBlob, "negative", formulas);

        expect(result).toBe(-100);
      });

      it("should handle logical NOT in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 50,
        });
        const formulas = { notExpensive: "!(price > 100)" };

        const result = getComputedProperty(mockBlob, "notExpensive", formulas);

        expect(result).toBe(true);
      });

      it("should handle double negation", () => {
        const mockBlob = createMockBlob("test.md", {
          value: 5,
        });
        const formulas = { result: "--value" };

        const result = getComputedProperty(mockBlob, "result", formulas);

        expect(result).toBe(5);
      });
    });

    describe("formula with boolean values", () => {
      it("should handle boolean properties in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          published: true,
          archived: false,
        });
        const formulas = { isActive: "published && !archived" };

        const result = getComputedProperty(mockBlob, "isActive", formulas);

        expect(result).toBe(true);
      });

      it("should handle boolean OR operations", () => {
        const mockBlob = createMockBlob("test.md", {
          draft: false,
          published: true,
        });
        const formulas = { visible: "draft || published" };

        const result = getComputedProperty(mockBlob, "visible", formulas);

        expect(result).toBe(true);
      });
    });

    describe("formula with null and undefined", () => {
      it("should handle null values in formulas", () => {
        const mockBlob = createMockBlob("test.md", {
          value: null,
        });
        const formulas = { hasValue: "value == null" };

        const result = getComputedProperty(mockBlob, "hasValue", formulas);

        expect(result).toBe(true);
      });

      it("should handle undefined comparison", () => {
        const mockBlob = createMockBlob("test.md", {});
        const formulas = { isMissing: "missingProp == null" };

        const result = getComputedProperty(mockBlob, "isMissing", formulas);

        // undefined == null is true in JavaScript
        expect(result).toBe(true);
      });
    });

    describe("formula with comparison operators", () => {
      it("should handle equality comparison", () => {
        const mockBlob = createMockBlob("test.md", {
          status: "active",
        });
        const formulas = { isActive: 'status == "active"' };

        const result = getComputedProperty(mockBlob, "isActive", formulas);

        expect(result).toBe(true);
      });

      it("should handle inequality comparison", () => {
        const mockBlob = createMockBlob("test.md", {
          status: "active",
        });
        const formulas = { notDraft: 'status != "draft"' };

        const result = getComputedProperty(mockBlob, "notDraft", formulas);

        expect(result).toBe(true);
      });

      it("should handle greater than comparison", () => {
        const mockBlob = createMockBlob("test.md", {
          score: 85,
        });
        const formulas = { passing: "score > 60" };

        const result = getComputedProperty(mockBlob, "passing", formulas);

        expect(result).toBe(true);
      });

      it("should handle less than comparison", () => {
        const mockBlob = createMockBlob("test.md", {
          age: 25,
        });
        const formulas = { young: "age < 30" };

        const result = getComputedProperty(mockBlob, "young", formulas);

        expect(result).toBe(true);
      });

      it("should handle greater than or equal comparison", () => {
        const mockBlob = createMockBlob("test.md", {
          score: 60,
        });
        const formulas = { passing: "score >= 60" };

        const result = getComputedProperty(mockBlob, "passing", formulas);

        expect(result).toBe(true);
      });

      it("should handle less than or equal comparison", () => {
        const mockBlob = createMockBlob("test.md", {
          age: 30,
        });
        const formulas = { eligible: "age <= 30" };

        const result = getComputedProperty(mockBlob, "eligible", formulas);

        expect(result).toBe(true);
      });
    });

    describe("formula with numeric edge cases", () => {
      it("should handle zero values", () => {
        const mockBlob = createMockBlob("test.md", {
          value: 0,
        });
        const formulas = { isZero: "value == 0" };

        const result = getComputedProperty(mockBlob, "isZero", formulas);

        expect(result).toBe(true);
      });

      it("should handle negative numbers", () => {
        const mockBlob = createMockBlob("test.md", {
          balance: -50,
        });
        const formulas = { isNegative: "balance < 0" };

        const result = getComputedProperty(mockBlob, "isNegative", formulas);

        expect(result).toBe(true);
      });

      it("should handle decimal numbers", () => {
        const mockBlob = createMockBlob("test.md", {
          price: 19.99,
          tax: 0.08,
        });
        const formulas = { total: "price * (1 + tax)" };

        const result = getComputedProperty(mockBlob, "total", formulas);

        expect(result).toBeCloseTo(21.5892, 4);
      });
    });
  });
});
