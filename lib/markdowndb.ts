import { Knex } from "knex";
import * as fs from "fs";
import * as crypto from "crypto";
import matter from "gray-matter";

// TODO: separate database entity interface from file object interface
// using a similar logic to CachedMetadata
export interface MarkdownDBFile {
  _id: string;
  _path: string;
  //  TODO: maybe instead of having the relative path as
  //  a field there could be a configs table where we could
  //  store the original folderPath that was indexed
  _relative_path: string; //  Relative to the folderPath
  filetype: "md" | "mdx" | "csv" | "png";
  type: string;
}
export interface MarkdownDBMdxFile extends MarkdownDBFile {
  frontmatter: any;
  filetype: "md" | "mdx";
  tags: string[];
  links: string[];
}

const indexFolder = async (db: Knex, folderPath: string = "content") => {
  await createFilesTable(db);
  await createTagsTable(db);
  await createFileTagsTable(db);

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
    const markdownDBFile = createMarkdownDBFile(pathToFile, folderPath);

    const frontmatter = markdownDBFile.frontmatter;

    //  TODO: check if file exists
    //  TODO: replace for a batchInsert to increase performance
    await db("files").insert(markdownDBFile);

    // Clean up associated tags before adding tags
    await db("file_tags").where("file", markdownDBFile._id).delete();

    if (frontmatter && frontmatter.tags) {
      const tags = frontmatter.tags;
      const tagsToInsert = [];

      for (let tag of tags) {
        const selectTag = await db.select().from("tags").where("name", tag);

        if (!selectTag.length) {
          tagsToInsert.push({ name: tag });
        }
      }

      await db.batchInsert("tags", tagsToInsert);
      await db.batchInsert(
        "file_tags",
        tags.map((tag) => ({ tag, file: markdownDBFile._id }))
      );
    }
  }
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

const createMarkdownDBFile: (
  path: string,
  folderPath: string //  Needed to calculate relatitePath for now
) => MarkdownDBMdxFile = (path: string, folderPath: string) => {
  const filetype = path.split(".").at(-1);

  //  TODO: refactor
  const filenameLenght = path.split("/").at(-1).length;
  let relativePath = path.slice(folderPath.length + 1, -filenameLenght);

  const encodedPath = Buffer.from(path, "utf-8").toString();
  const id = crypto.createHash("sha1").update(encodedPath).digest("hex");

  let frontmatter = null;
  if (["md", "mdx"].includes(filetype)) {
    const source = fs.readFileSync(path, { encoding: "utf8", flag: "r" });
    const { data } = matter(source);
    frontmatter = data;
  }

  return {
    _id: id,
    _path: path,
    _relative_path: relativePath,
    frontmatter,
    filetype,
    type: frontmatter?.type || null,
  } as MarkdownDBMdxFile;
};

//  Optional params so that we can build complex dynamic queries
//  E.g I want all files in the blogs folder with X and Y tags
interface DatabaseQuery {
  folder?: string;
  type?: string; // TODO
  tags?: string[];
}

class MarkdownDB {
  db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  getFileInfo() {}
  async getTags() {
    return this.db("tags")
      .select()
      .then((tags) => tags.map((tag) => tag.name));
  }
  query(query?: DatabaseQuery, fields = "") {
    //  TODO: return tags array
    const files = this.db
      .select(fields)
      //  TODO: how can we infer the specific type?
      //  Should we query only MDX files in this function?
      .from<MarkdownDBFile>("files")
      .where((builder) => {
        if (query) {
          if (query.folder) {
            let folder = query.folder;

            if (folder.at(-1) === "/") {
              folder = query.folder.slice(0, -1);
            }

            builder.whereLike("_relative_path", `${folder}%`);
          }

          if (query.tags) {
            const tags = query.tags;
            const joinedTags = tags.map((tag) => `"${tag}"`).join(",");

            builder.whereExists(
              this.db
                .select()
                .from("file_tags")
                .whereRaw(
                  `file_tags.file = files._id AND file_tags.tag IN (${joinedTags})`
                )
            );
          }
        }
      });

    return files;
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
