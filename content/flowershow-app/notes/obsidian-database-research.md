---
title: Obsidian Database Research
---

Research on the details of the internal [[notes/obsidian|Obsidian]] "database" i.e. its cache of files and their metadata, links etc which in turn power functionality like network graph, page links, plugins etc.

Relates to Flowershow's need to have its own metadata database to power things like a network graph, links etc (tracking issue: https://github.com/flowershow/flowershow/issues/5)

Note: Obsidian is closed source so we don't know the internal code implementation. However, we have some insight into the cache itself both by inspecting it on disk and by examining the API exposed to plugins.

# Motivating questions

- What is the API structure of the Obsidian metadata database?
  - Specifically what API structure for read-only functionality in tools like data-view plugin or budiling a n
- What is the raw (tables and columns) structure of the database?
  - What is the location of the database on disk?
- Can one access that database directly using off-the-shelf tools?
- How would one create such a database from scratch?

So that ... we can either reuse obsidian metadata database or (more likely) reproduce the core database and API features we need

So that we can provide functionality in flowershow like [[docs/network-graph]], [[docs/forward-and-back-links]]

# Summary

Have some basic info but not a lot of detail yet and also some info online looks out of date. Could not find any detailed deep dive into the internal structure of obsidian indexeddb so far. May have to do it ourselves.

- Obsidian database is an IndexedDB file in the System directory. On e.g. Mac this is at `~/Library/Application\ Support/obsidian`
  - System directory location from https://help.obsidian.md/Advanced+topics/How+Obsidian+stores+data
    > Obsidian also stores some information in the system directory. This is different per Operating System; on Mac it's `/Users/yourusername/Library/Application Support/obsidian`, on Windows `%APPDATA%\Obsidian\`, and `$XDG_CONFIG_HOME/Obsidian/` or `~/.config/Obsidian/` on Linux. As a result, we recommend against creating a vault in this directory.
    >
    > Aside from that, though, you can create a Vault anywhere your operating system will allow. Obsidian files sync fine with Dropbox, iCloud, OneDrive, git, and every other syncing service we've tried thus far.
  - It's IndexedDB. Source: https://forum.obsidian.md/t/understanding-obsidian-and-how-it-works/30603
- Location: #todo ❗ have not been able to locate this yet.
  - Out of date suggestion was it is at `{VAULT-ID}-cache`
- What is Database API? Defined in MetadataCache (the search API) and CachedMetadata (the actual file object) in https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts
  - See https://forum.obsidian.md/t/understanding-obsidian-and-how-it-works/30603 "... [see] [obsidian-api/obsidian.d.ts at master · obsidianmd/obsidian-api · GitHub 68](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts) – the MetadataCache and its CachedMetadata records describe precisely what information is indexed and how, so that plugins can use it."
- What is database structure? Currently unknown. #todo
  - What tool to use to browse an indexeddb databasae? Recommend dexie.js and here's how to import a file from disk and look at the tables in it https://dexie.org/docs/ExportImport/dexie-export-import

# Inbox

- look into how https://github.com/blacksmithgu/obsidian-dataview works

# Notes

## 2023-02-18 - obsidian is very fast

Jan 2022: https://www.goedel.io/p/tft-performance-obsidian

Read this a while ago and indicates obsidian is very fast at indexing. (and at everything else). wonder how.

## 2022-11-06

Key links and info found below.

- Post about security that mentions vault locations https://forum.obsidian.md/t/security-vault-contents-exposed-outside-the-vaults-directory/28886
  - > Within the `{VAULTID}-cache` database, the `file` table exposes the names and paths of the files within the vault (Markdown files, images, etc), and the `metadata` table exposes the headings/tags/etc used by the Markdown documents within the vault.
  - 🚩 however checking my local install this no longer seems correct as no `{VAULTID}-cache` file

Asides:

- may want to check out https://github.com/scambier/obsidian-omnisearch to learn how it gets access docs to build its own index

### https://help.obsidian.md/Advanced+topics/How+Obsidian+stores+data

> Obsidian also stores some information in the system directory. This is different per Operating System; on Mac it's `/Users/yourusername/Library/Application Support/obsidian`, on Windows `%APPDATA%\Obsidian\`, and `$XDG_CONFIG_HOME/Obsidian/` or `~/.config/Obsidian/` on Linux. As a result, we recommend against creating a vault in this directory.
>
> Aside from that, though, you can create a Vault anywhere your operating system will allow. Obsidian files sync fine with Dropbox, iCloud, OneDrive, git, and every other syncing service we've tried thus far.

### https://forum.obsidian.md/t/understanding-obsidian-and-how-it-works/30603

> However, the *technical* argument that “Obsidian’s not the same because it’s not a database” is just flat wrong. Obsidian does have a database, it’s in IndexedDB, and it indexes every paragraph and every line of every list along with block IDs and the hierarchies thereof, and it’s almost-instantly updated whenever the notes change, even if you edit them in another program! Which gives Obsidian a level of ability to integrate with other tools that’s unmatched by the competition.

### https://github.com/obsidianmd/obsidian-api/issues/33#issuecomment-997595838

lengthy comment from Dec 2021 explaining there are 2 caches a persistent and ephemeral one: "There are two types of cache, **ephemeral** and **persistent**. ..."

> There are two types of cache, **ephemeral** and **persistent**.
>
> The **persistent cache** holds aggregated results of the remark parser in an IndexedDB. For each file in the vault, the persistent cache holds a list of links, embeds, list items, sections, tags, frontmatter... and their respective positions in the document. This cache is primed from scratch one time, the first time you load Obsidian (or if the index is deleted). The persistent cache is continuously updated via various event triggers, such as rename, create, delete, etc.
>
> It would be difficult to alter the content/population of the persistent cache for the reasons Licat details above. Since the cache is persistent, it would be difficult to undo any changes to the cached content that were made by a plugin. It would also cause side effects to all of the logic that currently relies on the persistent cache and makes assumptions about its contents and structure.
>
> The **ephemeral cache** is initialized on application startup, leveraging the data from the persistent cache. The most interesting data in the ephemeral cache is the list of resolved and unresolved links. These data structures are used to build out the relationships between graph nodes and are also continuously updated via various event triggers.
>
> The ephemeral cache seems easier for plugins to modify since, on plugin unload, the ephemeral cache could just be rebuilt on the fly. This isn't a cheap operation but it typically completes in under a second.
>
> In the case of the resolved/unresolved link cache, a link resolver process iterates over all markdown files in the vault and checks to see if the links in each file resolves to an actual document. The components involved in this:
>
> - A link resolver queue: `MetadataCache.linkResolverQueue`
> - A link resolver orchestrator: `MetadataCache.linkResolver()`
> - A link resolver worker: `MetadataCache.resolveLinks(srcFilePath)`
>
> On app startup, all markdown files within the vault are passed into the `linkResolverQueue` and the results are stored in the resolved and unresolved link cache.

## 2022-03-12

Investigating [[notes/obsidian]] vault structure

* Does Obsidian have an index? ✅ Yes
* What is the API to it? ✅ https://marcus.se.net/obsidian-plugin-docs/api/classes/MetadataCache
* Where is it stored? ✅ https://help.obsidian.md/Advanced+topics/How+Obsidian+stores+data "Obsidian also stores some information in the system directory. This is different per Operating System; on Mac it's `/Users/yourusername/Library/Application Support/obsidian`"
* What is the structure of that index?
- How do you use it from a plugin? ✅ `import MetadataCache from 'obsidian'` see e.g. https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/data-index/index.ts#L4