# Unified Config Follow-up Design

**Date:** 2026-05-19
**Branch:** feat/unified-config (continues from 2026-04-29 plan)

## Problem

The initial unified-config implementation left three gaps:
1. Array-valued config fields (`nav.links`, `footer.navigation`, `social`, `contentInclude/Exclude/Hide`, `sidebar.paths`, `redirects`) have no dashboard editors — users must edit `config.json` directly.
2. Nine Site columns (`enableComments`, `enableSearch`, `enableRss`, `showSidebar`, `showBuiltWithButton`, `showRawLink`, `syntaxMode`, `giscusRepoId`, `giscusCategoryId`) are still the authoritative write target for their dashboard fields — they bypass `configJson` entirely.
3. Config precedence is undocumented.

## Decisions

### Array field editors: JSON textarea
All array fields use a `<textarea>` pre-filled with pretty-printed JSON. Client-side validation is JSON.parse only (no schema). This is intentional — power users who reach these settings can follow the documented shape; full schema validation is over-engineered here.

### Column migration: one-time SQL, then read from configJson only
A Prisma migration runs a single `UPDATE` that copies all nine columns into `configJson` for every existing row. After deploy, all code reads and writes through `configJson`. The physical columns remain (not dropped in this PR) but are no longer the source of truth.

### No config source indicator
The precedence is documented in the docs. No UI badge is needed.

### Config precedence
```
defaults → dashboard (configJson) → config.json (file)
```
Later sources win. `config.json` always overrides the dashboard.

## Data Model Changes

`SiteConfigJson` gains the following fields (previously column-only):

```ts
enableComments?: boolean
enableSearch?: boolean
enableRss?: boolean
showSidebar?: boolean
showBuiltWithButton?: boolean
showRawLink?: boolean
syntaxMode?: 'auto' | 'md' | 'mdx'
giscus?: { repoId?: string; categoryId?: string }
```

The `giscus` shape is nested to match the existing `SiteConfig.giscus` convention. This aligns with `config.json` format where `giscus.repoId` / `giscus.categoryId` are standard.

## Migration SQL

```sql
UPDATE "Site"
SET "config_json" =
  jsonb_strip_nulls(jsonb_build_object(
    'enableComments', "enable_comments",
    'enableSearch',   "enable_search",
    'enableRss',      "enable_rss",
    'showSidebar',    "show_sidebar",
    'showBuiltWithButton', "show_built_with_button",
    'showRawLink',    "show_raw_link",
    'syntaxMode',     "syntax_mode"::text,
    'giscus', CASE
      WHEN "giscus_repo_id" IS NOT NULL OR "giscus_category_id" IS NOT NULL
      THEN jsonb_strip_nulls(jsonb_build_object(
        'repoId',     "giscus_repo_id",
        'categoryId', "giscus_category_id"
      ))
      ELSE NULL
    END
  )) || COALESCE("config_json", '{}')::jsonb;
```

Right side (`|| COALESCE(config_json, '{}')`) wins, so any value already explicitly set in `configJson` is preserved. Column values fill in what's missing.

## Component: JsonForm

New `components/dashboard/json-form.tsx` — a variant of `Form` for array/object fields:

```
┌─────────────────────────────────────────┐
│ Nav Links                               │
│ Navigation items shown in the header.  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [                                 ] │ │
│ │ [  {                              ] │ │
│ │ [    "name": "Blog",              ] │ │
│ │ [    "href": "/blog"              ] │ │
│ │ [  }                              ] │ │
│ │ []                                  │ │
│ └─────────────────────────────────────┘ │
│ Invalid JSON: Unexpected token at ...   │← inline error
├─────────────────────────────────────────┤
│                          [Save Changes] │
└─────────────────────────────────────────┘
```

Props:
- `title`, `description`, `helpText` — same as `Form`
- `fieldName` — string identifier (for `data-testid`)
- `defaultValue: unknown` — current value (array/object/null), serialized to JSON for display
- `handleSubmit: (id: string, value: unknown) => Promise<void>` — called with parsed value

## Dashboard Changes

### Write path changes (updateSite → updateConfigJson)

| Page | Field | New configJson write |
|---|---|---|
| General | Syntax Mode | `{ syntaxMode: value }` |
| Appearance | Show Branding | `{ showBuiltWithButton: bool }` |
| Content | Show Sidebar | `{ showSidebar: bool }` |
| Content | RSS Feed | `{ enableRss: bool }` |
| Content | Show Raw Link | `{ showRawLink: bool }` |
| Integrations | Comments | `{ enableComments: bool }` |
| Integrations | Giscus Repo ID | `{ giscus: { repoId: value } }` |
| Integrations | Giscus Category ID | `{ giscus: { categoryId: value } }` |
| Integrations | Full-Text Search | `{ enableSearch: bool }` |

`autoSync` stays on `site.update` — it triggers webhook side effects, not just config.

### Default value reads

All forms reading from `site.*` columns switch to `siteConfig.*` for the migrated fields.

### New JSON editors

**Appearance page:**
- Nav Links (`nav.links`) — `[{"name":"Blog","href":"/blog"}]`
- Social Links (`social`) — `[{"name":"GitHub","href":"...","label":"github"}]`
- Footer Navigation (`footer.navigation`) — `[{"title":"Docs","links":[{"name":"Intro","href":"/docs"}]}]`

**Content page:**
- Content Include (`contentInclude`) — `["notes/","blog/"]`
- Content Exclude (`contentExclude`) — `["drafts/"]`
- Content Hide (`contentHide`) — `["_assets/"]`
- Sidebar Paths (`sidebar.paths`) — `["docs/","guides/"]`
- Redirects (`redirects`) — `[{"from":"/old","to":"/new","permanent":true}]`

## Public Site Changes

### layout.tsx
- `site.enableSearch` → `siteConfig?.enableSearch ?? false`
- `site.showBuiltWithButton` → `siteConfig?.showBuiltWithButton ?? true`

### [[...slug]]/page.tsx
- `site.enableRss` → `siteConfig?.enableRss ?? false`
- `site.syntaxMode` → `siteConfig?.syntaxMode ?? 'auto'`
- `site.showRawLink` → `siteConfig?.showRawLink ?? false`
- `site.enableComments` → `siteConfig?.enableComments ?? false`
- `site.giscusRepoId` fallback → `siteConfig?.giscus?.repoId`
- `site.giscusCategoryId` fallback → `siteConfig?.giscus?.categoryId`
- `site.showSidebar` fallback → `siteConfig?.showSidebar ?? true`

## REST API Changes

### GET /api/sites/id/[siteId]
Select `configJson` from DB. Return `enableComments`, `enableSearch`, `showSidebar`, `syntaxMode` from `configJson` (with column defaults as fallback during transition).

### GET /api/rss/[user]/[project]
Select `configJson`. Read `enableRss` from `configJson.enableRss` instead of `site.enableRss`.

## Out of Scope

- Dropping the migrated columns — follow-up PR after verification
- `autoSync` column migration — triggers webhook, different from rendering config
- `privacyMode`, `plan`, `customDomain`, `subdomain` — infrastructure, not rendering config
