import { Knex } from "knex";
import * as fs from "fs";
import * as crypto from "crypto";
import matter from "gray-matter";

// File entity type
// Maps to fields on the DB
export type MarkdownDBDatabaseFile<T = {}> = {
  _id: string;
  _path: string;
  _relative_path: string; //  Relative to the folderPath, makes it easier to query by folder
  filetype: string;
  frontmatter: any;
  type: string;
} & T;

//  Every mdx file will have tags and links
//  Generic so that we can create custom
//  types later... Not definite
//  await MyMdDb.query({ filetype: ["md", "mdx"] })
export type MDXFile<T = {}> = MarkdownDBDatabaseFile<{
  tags: string[];
  links: string[];
}> &
  T;

const indexFolder = async (db: Knex, folderPath: string = "content") => {
  await createFilesTable(db);
  await createTagsTable(db);
  await createFileTagsTable(db);

  const pathsToFiles = walkFolder(folderPath);

  const filesToInsert = [];
  const tagsToInsert = [];
  const fileTagsToInsert = [];

  for (let pathToFile of pathsToFiles) {
    const file = createDatabaseFile(pathToFile, folderPath);
    filesToInsert.push(file);

    //  There are probanly better ways of doing this...
    if (["md", "mdx"].includes(file.filetype)) {
      const tags = file.frontmatter?.tags || [];

      for (let tag of tags) {
        if (!tagsToInsert.find((item) => item.name === tag)) {
          tagsToInsert.push({ name: tag });
        }
        fileTagsToInsert.push({ tag, file: file._id });
      }
    }
  }

  await db.batchInsert("files", filesToInsert);
  await db.batchInsert("tags", tagsToInsert);
  await db.batchInsert("file_tags", fileTagsToInsert);
};

//  Get files inside a folder, return an array of file paths
const walkFolder = (dir: fs.PathLike) => {
  let files = [];
  for (let item of fs.readdirSync(dir)) {
    if (!(dir as string).endsWith("/")) {
      dir += "/";
    }

    const fullPath = dir + item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files = files.concat(walkFolder(fullPath));
    } else if (stat.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

const createFilesTable = async (db: Knex) => {
  const tableExists = await db.schema.hasTable("files");

  if (!tableExists) {
    await db.schema.createTable("files", (table) => {
      table.string("_id").primary();
      table.string("_path").unique().notNullable();
      table.string("_relative_path").notNullable();
      table.json("frontmatter");
      table.enu("filetype", ["md", "mdx", "csv", "png"]).notNullable();
      // table.enu("fileclass", ["text", "image", "data"]).notNullable();
      table.string("type"); // type field in frontmatter if it exists
    });
  }
};

const createTagsTable = async (db: Knex) => {
  const tableExists = await db.schema.hasTable("tags");

  if (!tableExists) {
    await db.schema.createTable("tags", (table) => {
      // table.string("_id"); We probably don't need an id
      table.string("name").primary();
    });
  }
};

const createFileTagsTable = async (db: Knex) => {
  const tableExists = await db.schema.hasTable("file_tags");

  if (!tableExists) {
    await db.schema.createTable("file_tags", (table) => {
      table.string("tag").notNullable();
      table.string("file").notNullable();

      table.foreign("tag").references("tags.name").onDelete("CASCADE");
      table.foreign("file").references("files._id").onDelete("CASCADE");
      //  ... maybe onUpdate(CASCADE) as well?
    });
  }
};

const createDatabaseFile: (
  path: string,
  folderPath: string //  Needed to calculate relatitePath for now
) => MarkdownDBDatabaseFile = (path: string, folderPath: string) => {
  const filetype = path.split(".").at(-1);

  let relativePath = path.slice(folderPath.length + 1);

  const encodedPath = Buffer.from(path, "utf-8").toString();
  const id = crypto.createHash("sha1").update(encodedPath).digest("hex");

  const file = {
    _id: id,
    _path: path,
    _relative_path: relativePath,
    filetype,
    frontmatter: null,
    type: null,
  };

  if (["md", "mdx"].includes(filetype)) {
    const source = fs.readFileSync(path, { encoding: "utf8", flag: "r" });
    const { data } = matter(source);
    file["frontmatter"] = data || null;
    file["type"] = data.type || null;
  }

  return file;
};

//  Optional params so that we can build complex dynamic queries
//  E.g I want all files in the blogs folder with X and Y tags
interface DatabaseQuery {
  folder?: string;
  type?: string; // TODO
  tags?: string[];
  filetypes?: string[];
}

class MarkdownDB {
  db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  async getTags() {
    return this.db("tags")
      .select()
      .then((tags) => tags.map((tag) => tag.name));
  }

  async query<T = MarkdownDBDatabaseFile>(
    query?: DatabaseQuery
  ): Promise<MarkdownDBDatabaseFile<T>[]> {
    const files = this.db
      .select("files.*", this.db.raw("GROUP_CONCAT(tag) as tags")) //  Very hackish way to return tags without duplicating rows
      .from<MarkdownDBDatabaseFile>("files")
      .leftJoin("file_tags AS ft", "ft.file", "_id")
      .where((builder) => {
        if (query) {
          let folder = query.folder;
          if (folder) {
            if (folder.at(-1) === "/") {
              folder = query.folder.slice(0, -1);
            }

            builder.whereLike("_relative_path", `${folder}%`);
          }

          const tags = query.tags;
          if (tags) {
            builder.whereIn("tag", tags);
          }

          const filetypes = query.filetypes;
          if (filetypes) {
            builder.whereIn("filetype", filetypes);
          }
        }
      })
      .groupBy("_id");

    return files.then((files) => {
      return files.map((file) => {
        if (["mdx", "md"].includes(file.filetype)) {
          file.tags = file.tags?.split(",") || [];

          //  TODO: probably apply custom types here
          const source = fs.readFileSync(file._path, {
            encoding: "utf8",
            flag: "r",
          });

          return { ...file, source };
        } else {
          delete file.tags;
        }
        return file;
      });
    });
  }
}

//  MarkdownDB Factory
const Database = (db: Knex): MarkdownDB => {
  return new MarkdownDB(db);
};

export default {
  indexFolder,
  Database,
};
