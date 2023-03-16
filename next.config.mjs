import { withContentlayer } from "next-contentlayer";

//  Temporary solution to call indexFolder on start
import { indexFolder } from "./lib/markdowndb/dist/index.js";

//  Couldn't make this work:
//  import  indexFolder from "./lib/markdowndb";
//  But it does for contentlayer, somehow
//  We should try again after removing contentlayer and renaming this to .js

//  DB file path
const pathToMddb = "markdown.db";
await indexFolder(pathToMddb);

export default withContentlayer({
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverRuntimeConfig: {
    pathToMddb,
  },
  webpack: (config) => {
    config.infrastructureLogging = {
      level: "error",
    };
    return config;
  },
});
