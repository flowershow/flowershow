# RFC: Render In Cloudflare Worker

## Context

Today, public page rendering happens in Next.js at request time via `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`, using the `next-mdx-remote-client` pipeline plus custom remark/rehype plugins. The Cloudflare Worker (separate repo) currently parses markdown for metadata and Typesense indexing, but does not compile to HTML.

This RFC outlines a pre-rendered architecture that moves markdown/MDX compilation into the ingest pipeline and serves HTML directly from R2 (via Worker or a thin Next.js handler).

## Proposal (Pre-rendered)

- Compile markdown/MDX to HTML during ingest.
- Store rendered HTML + metadata artifacts in R2 alongside raw files.
- Serve rendered HTML directly from R2 (Worker or thin Next.js route).
- Keep Next.js for dashboard/auth only (optional), or retire it for public pages.

### Storage layout (example)

```
{siteId}/{branch}/raw/{path}.md
{siteId}/{branch}/rendered/{path}.html
{siteId}/{branch}/rendered/{path}.json  # metadata, permalinks, title, description
{siteId}/{branch}/rendered/assets/{path}.json  # optional: asset manifest
```

## Benefits

- Faster public responses (no runtime markdown/MDX compilation).
- Lower compute cost per request.
- Simpler public runtime (edge worker or static CDN).

## Tradeoffs / Risks

- Must ensure Worker-compatible MDX compilation.
- Interactive components may need hydration bundles or be rewritten to static HTML.
- Build/pipeline complexity increases (more work during ingest).

## Implementation Notes

- Extend the existing Cloudflare worker to compile markdown/MDX to HTML.
- Update Next.js public page route to fetch rendered HTML from R2.
- Ensure metadata stays in Postgres (for search, dashboards, etc).
- Add cache headers/ETags at the HTML serving layer.

## Execution Plan

### 1) Plugin compatibility audit

Identify which markdown/MDX plugins are Worker-compatible and which require Node APIs or Next-specific internals. Replace or refactor as needed.

Targets in this repo:
- `lib/markdown.ts` (remark/rehype stack)
- `lib/remark-*.ts` custom plugins
- `components/public/mdx/*` for MDX component bindings

### 2) R2 artifact layout + manifest

Define and implement a storage contract for rendered output:
- HTML file per blob
- Metadata JSON for frontmatter/derived fields
- Optional asset manifest for any client-side scripts or CSS

Make the contract explicit so both the Worker and the serving layer can read/write it consistently.

### 3) Migration steps

1. Extend the worker pipeline to produce HTML + metadata in R2.
2. Create a temporary Next.js route that serves rendered HTML from R2 (to validate output while keeping existing renderer as fallback).
3. Cut over public pages to serve HTML from R2 only.
4. Remove or shrink Next.js public rendering logic once stable.
