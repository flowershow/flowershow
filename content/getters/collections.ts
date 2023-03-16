import mdDb from "@/lib/mdDb";

export default async function getCollections() {
  let allCollections = await mdDb.query({
    folder: "collections",
    filetypes: ["md", "mdx"],
  });

  //  Temporary, flowershow/BlogsList expcted the contentlayer fields
  allCollections = allCollections.map((b) => {
    return { ...b, ...b.metadata, url_path: b._url_path };
  });

  return allCollections.sort(
    (a, b) =>
      new Date(b.metadata.created).getTime() -
      new Date(a.metadata.created).getTime()
  );
}
