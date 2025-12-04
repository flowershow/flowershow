import { describe, it, expect } from "vitest";
import { buildPrismaWhereClause } from "./remark-obsidian-bases";
import type { Prisma } from "@prisma/client";

describe("buildPrismaComparison", () => {
  describe("file property comparisons", () => {
    it("should build equality comparison for file.ext", () => {
      const filter = 'file.ext == "md"';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        extension: "md",
      });
    });

    it("should build inequality comparison for file.ext", () => {
      const filter = 'file.ext != "pdf"';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        extension: { not: "pdf" },
      });
    });

    it("should build equality comparison for file.path", () => {
      const filter = 'file.path == "notes/test.md"';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        path: "notes/test.md",
      });
    });

    it("should build greater than comparison for file.path", () => {
      const filter = 'file.path > "a"';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        path: { gt: "a" },
      });
    });

    it("should build less than comparison for file.path", () => {
      const filter = 'file.path < "z"';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        path: { lt: "z" },
      });
    });

    it("should build greater than or equal comparison", () => {
      const filter = 'file.path >= "m"';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        path: { gte: "m" },
      });
    });

    it("should build less than or equal comparison", () => {
      const filter = 'file.path <= "n"';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        path: { lte: "n" },
      });
    });
  });

  describe("computed file properties", () => {
    it("should return null for file.folder comparison (requires post-filter)", () => {
      const filter = 'file.folder == "notes"';
      const { where, postFilter } = buildPrismaWhereClause(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
    });

    it("should return null for file.name comparison (requires post-filter)", () => {
      const filter = 'file.name == "test.md"';
      const { where, postFilter } = buildPrismaWhereClause(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
    });

    it("should handle file.folder comparison with rootDir in post-filter", () => {
      const filter = 'file.folder == "Test"';
      const { where, postFilter } = buildPrismaWhereClause(filter, "Public");

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
      const { where, postFilter } = buildPrismaWhereClause(filter, "Public");

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
      const { where, postFilter } = buildPrismaWhereClause(filter);

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
      const { where, postFilter } = buildPrismaWhereClause(filter, "Public");

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
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["price"],
          equals: 100,
        },
      });
    });

    it("should build inequality comparison for note property", () => {
      const filter = "status != 'draft'";
      const { where } = buildPrismaWhereClause(filter);

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
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["rating"],
          gt: 4,
        },
      });
    });

    it("should build less than comparison for note property", () => {
      const filter = "count < 10";
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["count"],
          lt: 10,
        },
      });
    });

    it("should build greater than or equal comparison for note property", () => {
      const filter = "score >= 50";
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["score"],
          gte: 50,
        },
      });
    });

    it("should build less than or equal comparison for note property", () => {
      const filter = "age <= 30";
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["age"],
          lte: 30,
        },
      });
    });

    it("should handle note.property syntax", () => {
      const filter = "note.title == 'Test'";
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["title"],
          equals: "Test",
        },
      });
    });

    it("should handle formula.property syntax", () => {
      const filter = "formula.total == 100";
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["total"],
          equals: 100,
        },
      });
    });
  });

  describe("special function calls", () => {
    it("should build where clause for file.inFolder", () => {
      const filter = 'file.inFolder("notes")';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        path: {
          startsWith: "notes/",
        },
      });
    });

    it("should handle file.inFolder with trailing slash", () => {
      const filter = 'file.inFolder("notes/")';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        path: {
          startsWith: "notes/",
        },
      });
    });

    it("should strip rootDir prefix from file.inFolder", () => {
      const filter = 'file.inFolder("Public/notes")';
      const { where } = buildPrismaWhereClause(filter, "Public");

      expect(where).toEqual({
        path: {
          startsWith: "notes/",
        },
      });
    });

    it("should return empty where clause when folder equals rootDir", () => {
      const filter = 'file.inFolder("Public")';
      const { where } = buildPrismaWhereClause(filter, "Public");

      expect(where).toEqual({});
    });

    it("should build where clause for file.hasProperty", () => {
      const filter = 'file.hasProperty("tags")';
      const { where } = buildPrismaWhereClause(filter);

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
      const { where } = buildPrismaWhereClause(filter);

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
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        OR: [{ extension: "md" }, { extension: "txt" }],
      });
    });

    it("should handle NOT operator", () => {
      const filter = {
        not: ['file.ext == "pdf"'],
      };
      const { where } = buildPrismaWhereClause(filter);

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
      const { where } = buildPrismaWhereClause(filter);

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
      const { where, postFilter } = buildPrismaWhereClause(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
      expect(typeof postFilter).toBe("function");
    });

    it("should combine Prisma where and post-filter for mixed conditions", () => {
      const filter = {
        and: ['file.ext == "md"', 'file.name == "test.md"'],
      };
      const { where, postFilter } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        AND: [{ extension: "md" }],
      });
      expect(postFilter).toBeDefined();
    });

    it("should handle OR with post-filter predicates", () => {
      const filter = {
        or: ['file.name == "test.md"', 'file.folder == "notes"'],
      };
      const { where, postFilter } = buildPrismaWhereClause(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
    });

    it("should handle NOT with post-filter predicates", () => {
      const filter = {
        not: ['file.name == "test.md"'],
      };
      const { where, postFilter } = buildPrismaWhereClause(filter);

      expect(where).toEqual({});
      expect(postFilter).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty filter object", () => {
      const filter = {};
      const { where, postFilter } = buildPrismaWhereClause(filter as any);

      expect(where).toEqual({});
      expect(postFilter).toBeUndefined();
    });

    it("should handle numeric values", () => {
      const filter = "count == 42";
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["count"],
          equals: 42,
        },
      });
    });

    it("should handle boolean values", () => {
      const filter = "published == true";
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["published"],
          equals: true,
        },
      });
    });

    it("should handle null values", () => {
      const filter = "value == null";
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["value"],
          equals: null,
        },
      });
    });

    it("should handle string values with quotes", () => {
      const filter = 'title == "Hello World"';
      const { where } = buildPrismaWhereClause(filter);

      expect(where).toEqual({
        metadata: {
          path: ["title"],
          equals: "Hello World",
        },
      });
    });

    it("should handle rootDir with leading slash", () => {
      const filter = 'file.inFolder("Public/notes")';
      const { where } = buildPrismaWhereClause(filter, "Public");

      expect(where).toEqual({
        path: {
          startsWith: "notes/",
        },
      });
    });

    it("should strip rootDir prefix from file.path comparison", () => {
      const filter = 'file.path == "Public/notes/test.md"';
      const { where } = buildPrismaWhereClause(filter, "Public");

      expect(where).toEqual({
        path: "notes/test.md",
      });
    });

    it("should strip rootDir prefix with leading slash from file.path", () => {
      const filter = 'file.path == "Public/folder/file.md"';
      const { where } = buildPrismaWhereClause(filter, "Public");

      expect(where).toEqual({
        path: "folder/file.md",
      });
    });

    it("should handle file.path comparison without rootDir prefix", () => {
      const filter = 'file.path == "notes/test.md"';
      const { where } = buildPrismaWhereClause(filter, "Public");

      expect(where).toEqual({
        path: "notes/test.md",
      });
    });

    it("should strip rootDir from file.path with inequality operator", () => {
      const filter = 'file.path != "Public/notes/test.md"';
      const { where } = buildPrismaWhereClause(filter, "Public");

      expect(where).toEqual({
        path: { not: "notes/test.md" },
      });
    });

    it("should strip rootDir from file.path with greater than operator", () => {
      const filter = 'file.path > "Public/a"';
      const { where } = buildPrismaWhereClause(filter, "Public");

      expect(where).toEqual({
        path: { gt: "a" },
      });
    });
  });

  describe("type safety", () => {
    it("should return correct Prisma.BlobWhereInput type", () => {
      const filter = 'file.ext == "md"';
      const { where } = buildPrismaWhereClause(filter);

      // Type assertion to ensure it matches Prisma type
      const prismaWhere: Prisma.BlobWhereInput = where;
      expect(prismaWhere).toBeDefined();
    });

    it("should handle all comparison operators", () => {
      const operators = ["==", "!=", ">", "<", ">=", "<="];

      operators.forEach((op) => {
        const filter = `price ${op} 100`;
        const { where } = buildPrismaWhereClause(filter);
        expect(where).toBeDefined();
        expect(where.metadata).toBeDefined();
      });
    });
  });
});
