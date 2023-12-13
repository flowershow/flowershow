import sitemap from "./sitemap.mjs";
import search from "./search.mjs";
import mddb from "./mddb.mjs";

await mddb();
await Promise.all([sitemap(), search()]);

process.exit();
