import mdDb from "@/lib/mdDb";

export default async function getBlogs() {
  let allBlogs = await mdDb.query({
    folder: "blog",
    filetypes: ["md", "mdx"],
  });

  //  Temporary, flowershow/BlogsList expects the contentlayer fields
  allBlogs = allBlogs.map((b) => {
    return { ...b, ...b.metadata, url_path: b._url_path };
  });

  return allBlogs.sort(
    (a, b) =>
      new Date(b.metadata.created).getTime() -
      new Date(a.metadata.created).getTime()
  );
}
