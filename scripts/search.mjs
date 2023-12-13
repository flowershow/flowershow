import { writeFileSync } from "fs";

import config from "../content/config.mjs";
import clientPromise from "../lib/mddb.mjs";

// const omit = (obj = {}, keys = []) => {
//   const result = Object.assign({}, obj);
//   keys.forEach((key) => {
//     delete result[key];
//   });
//   return result;
// };

export default async function search() {
  const mddb = await clientPromise;
  const allFiles = await mddb.getFiles({ extensions: ["md", "mdx"] });
  const coreContent = allFiles
    .filter((doc) => !doc.metadata?.isDraft)
    .map(
      (doc) => ({
        ...doc,
        sourceDir: doc.file_path,
        urlPath: doc.url_path,
      })
      // TODO old contentlayer related code
      // omit(
      //   {
      //     ...doc,
      //     sourceDir: doc.file_path
      //   },
      //   ["body", "_raw", "_id"]
      // )
    );

  if (config?.search?.provider === "kbar") {
    writeFileSync("public/search.json", JSON.stringify(coreContent));
    console.log("Local search index generated...");
  }
  return;
}
