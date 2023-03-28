---
date: 2023-03-05
---

# Obsidian

Obsidian is a knowledge base app built on top of local markdown files.

Why is obsidian interesting to us?

- **Markdown**: Obsidian is markdown based. It is a great demonstration of power and flexibility of markdown and our contention that [[notes/markdown-is-eating-the-world|markdown can take over]]
- **Editor** Great markdown editor (like VSCode but better and less geeky)
- **Renderer**: Not just an editor, a renderer. Has WYSIWYG markdown editing plus lots of extensions e.g. live knowledge base querying with data view plugin.
- **Markdown database**: Not just individual markdown editor but a knowledge base of markdown files (aka "content-base" aka database). Has lots of good functionality around this especially for linking and embedding.
- **Plugins**: Great plugin design and API and an amazing plugin ecosystem 

Specifically for us:

- Obsidian is a goto *editor* for power-users (including ourselves)
- Obsidian demonstrates as a *local* app many features we would like to have in our apps e.g. rich set of extensions to markdown such as
  - math
  - mermaid
  - syntax highlighting
  - wikilinks
  - and more ...
- Obsidian has a well-defined content layer API (which we can learn from)
  - [Perhaps even more relevant] Obsidian dataview plugin has Content Layer API (plus open source implementation): https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/data-index/index.ts

## Obsidian Content Layer API and Database

See [[obsidian-database-research]]

#todo refactor this content into there (or summary here)

#todo create obsidian data view page (or integrate into that page) and include https://github.com/blacksmithgu/obsidian-dataview/discussions/1811

Summary

- Database: `MetadataCache`
- Node (aka File): `CachedMetadata`

### MetadataCache

https://github.com/obsidianmd/obsidian-api/blob/bceb489fc25ceba5973119d6e57759d64850f90d/obsidian.d.ts#L2367

### CachedMetadata

https://github.com/obsidianmd/obsidian-api/blob/bceb489fc25ceba5973119d6e57759d64850f90d/obsidian.d.ts#L468

```typescript
export interface CachedMetadata {
    /**
     * @public
     */
    links?: LinkCache[];
    /**
     * @public
     */
    embeds?: EmbedCache[];
    /**
     * @public
     */
    tags?: TagCache[];
    /**
     * @public
     */
    headings?: HeadingCache[];
    /**
     * Sections are root level markdown blocks, which can be used to divide the document up.
     * @public
     */
    sections?: SectionCache[];
    /**
     * @public
     */
    listItems?: ListItemCache[];
    /**
     * @public
     */
    frontmatter?: FrontMatterCache;
    /**
     * @public
     */
    blocks?: Record<string, BlockCache>;
}
```