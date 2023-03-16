import mdDb from "../../lib/mdDb";

export default async function getDocs() {
  const allDocs = await mdDb.query({
    folder: "docs",
    filetypes: ["md", "mdx"],
  });

  return allDocs.sort((a, b) => a._path.localeCompare(b._path));
}
