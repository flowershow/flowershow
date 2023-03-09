import { Knex } from "knex";
import * as fs from "fs";
import * as crypto from "crypto";
import matter from "gray-matter";

export interface MarkdownDBFile {
  _id: string;
  _path: string;
  frontmatter: any;
  filetype: "md" | "mdx" | "csv" | "png";
  type: string;
}

const indexFolder = async (db: Knex, folderPath: string = "/content") => {
  const tableExists = await db.schema.hasTable("files");

  if (!tableExists) {
    await db.schema.createTable("files", (table) => {
      table.string("_id").primary();
      table.string("_path").unique().notNullable();
      table.json("frontmatter");
      table.enu("filetype", ["md", "mdx", "csv", "png"]).notNullable();
      // table.enu("fileclass", ["text", "image", "data"]).notNullable();
      table.string("type"); // type field in frontmatter if it exists
    });
  }

  // If the folder doesn't exist, create it (or throw?)
  // if (!fs.existsSync(folderPath)) {
  //   fs.mkdirSync(folderPath);
  // }

  //  Get files inside the folder
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

  const pathsToFiles = walk(folderPath);

  for (let pathToFile of pathsToFiles) {
    const markdownDBFile = createMarkdownDBFile(pathToFile);
    await db("files").insert(markdownDBFile);
  }
};

const createMarkdownDBFile: (path: string) => MarkdownDBFile = (
  path: string
) => {
  const fileExtension = path.split(".").at(-1);

  let frontmatter = null;
  if (["md", "mdx"].includes(fileExtension)) {
    const source = fs.readFileSync(path, { encoding: "utf8", flag: "r" });
    const { data } = matter(source);
    frontmatter = data;
  }

  const encodedPath = Buffer.from(path, "utf-8").toString();

  return {
    _id: crypto.createHash("sha1").update(encodedPath).digest("hex"),
    _path: path,
    frontmatter,
    filetype: fileExtension,
    type: frontmatter?.type || null,
  } as MarkdownDBFile;
};

const Database = (db: Knex) => {
  const database = Object.create({
    getFileInfo() {},
    getTags() {},
    query() {},
  });

  database.db = db;

  return database;
};

export default {
  indexFolder,
  Database,
};
