import knex from "knex";
import markdowndb, { MarkdownDBMdxFile } from "./markdowndb";
import * as fs from "fs";

/**
 * @jest-environment node
 */
describe("MarkdownDB lib", () => {
  it("builds a new MarkdownDB", async () => {
    const pathToFixturesFolder = "__tests__/fixtures/markdowndb";
    const dbConfig = {
      client: "sqlite3",
      connection: {
        filename: ":memory:",
      },
    };

    const db = knex(dbConfig);

    //  Index folder
    await markdowndb.indexFolder(db, pathToFixturesFolder);

    //  Ensure there is a "files" table
    expect(await db.schema.hasTable("files")).toBe(true);

    //  Ensure there is a "tags" table
    expect(await db.schema.hasTable("tags")).toBe(true);

    //  Ensure there is a "file_tags" table
    expect(await db.schema.hasTable("file_tags")).toBe(true);

    const myMdDb = markdowndb.Database(db);

    //  Check if all files were added
    const allFiles = walk(pathToFixturesFolder);
    const allFilesCount = allFiles.length;

    const allIndexedFiles = await myMdDb.query();
    expect(allIndexedFiles.length).toBe(allFilesCount);

    //  Check if querying by folder is working
    const blogFiles = allFiles.filter((p) =>
      p.startsWith(`${pathToFixturesFolder}/blog`)
    );
    const blogFilesCount = blogFiles.length;

    const indexedBlogFiles = await myMdDb.query({ folder: "blog" });
    expect(indexedBlogFiles.length).toBe(blogFilesCount);

    //  Check if querying by tags is working
    const economyFiles = await myMdDb.query({ tags: ["economy"] });
    expect(economyFiles.map((f) => f._path)).toEqual([
      `${pathToFixturesFolder}/blog/blog2.mdx`,
      `${pathToFixturesFolder}/blog/blog3.mdx`,
    ]);
  });
});

const walk = (dir: fs.PathLike) => {
  let files = [];
  for (let item of fs.readdirSync(dir)) {
    if (!(dir as string).endsWith("/")) {
      dir += "/";
    }

    const fullPath = dir + item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else if (stat.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};
