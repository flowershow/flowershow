import getConfig from "next/config";
import { Database } from "./markdowndb";

const config = getConfig();
const serverRuntimeConfig = config.serverRuntimeConfig;

//  Not really a singleton, but db the folder is being
//  indexed only once and we can access it anywhere by
//  importing this Database object
const mdDb = Database(serverRuntimeConfig.pathToMddb);

export default mdDb;