import knex from "knex";
import markdowndb, { MarkdownDBFile } from "./markdowndb";

/**
 * @jest-environment node
 */
describe("MarkdownDB lib", () => {
  it("builds a new MarkdownDB", async () => {
    const pathToFixturesFolder = "__tests__/fixtures/markdowndb/";
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

    const myMdDb = markdowndb.Database(db);

    //  Check if files were added
    const files = await db.select().from<MarkdownDBFile>("files");
    //  TODO: check if 3 files are right instead of if there are 3 files
    expect(files.length).toBe(3);
  });
});
