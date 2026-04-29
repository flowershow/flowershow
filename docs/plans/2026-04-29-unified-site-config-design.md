# Unified Site Configuration Design

**Date:** 2026-04-29

## Problem

Site configuration is split between `config.json` (nav, theme, analytics, etc.) and the dashboard (comments, search, RSS, branding, etc.) with no clear rule for which lives where. There is no defined precedence when both define the same setting.

## Decision

Adopt a single merge model:

```
resolved config = defaults → configJson (DB) → config.json (file)
```

Later sources override earlier ones. `config.json` always wins over dashboard values.

## Data Model

Add one column to the `Site` Prisma model:

```prisma
configJson  Json?  @default("{}")
```

Type: PostgreSQL JSONB. Stores all site rendering config not already covered by existing columns.

### SiteConfigJson shape

```ts
interface SiteConfigJson {
  title?: string
  description?: string
  image?: string
  favicon?: string
  nav?: NavConfig
  footer?: FooterConfig
  social?: SocialConfig
  analytics?: AnalyticsConfig
  umami?: UmamiConfig
  showToc?: boolean
  sidebar?: SidebarConfig
  theme?: ThemeConfig
  redirects?: RedirectConfig[]
  contentInclude?: string[]
  contentExclude?: string[]
  contentHide?: string[]
  showEditLink?: boolean
}
```

Existing columns (`enableComments`, `enableSearch`, `enableRss`, `showSidebar`, `showBuiltWithButton`, `showRawLink`, `syntaxMode`, `giscusRepoId`, `giscusCategoryId`) are unchanged and stay as the write target for their respective dashboard fields.

## Configuration Resolution

New utility: `lib/site-config.ts`

```ts
function resolveSiteConfig(
  defaults: SiteConfigJson,
  dbConfigJson: SiteConfigJson | null,
  fileConfig: SiteConfig | null,
): ResolvedSiteConfig
```

- Shallow merge at top level, deep merge for nested objects
- `fileConfig.nav` deep-merges over `dbConfigJson.nav` (keys survive unless explicitly overridden)
- The public site layout calls this instead of the current `??` chains

## API Changes

### New: `site.updateConfigJson`

```ts
site.updateConfigJson({ siteId, config: Partial<SiteConfigJson> })
```

Deep-merges the patch into the existing `Site.configJson`. Write path for all new dashboard fields.

### Updated: `site.getConfig`

- Reads `config.json` from R2 (unchanged)
- Also reads `Site.configJson` from DB
- Calls `resolveSiteConfig()` and returns merged result
- Public site layout gets the fully resolved config from one call

### Unchanged: `site.update`

Existing column-backed settings continue using this mutation.

## Dashboard Structure

Split the current single settings page into route-based sections:

| Route | Section | Fields |
|---|---|---|
| `/settings/` | General | Name, title, description, image, favicon, syntax mode |
| `/settings/appearance/` | Appearance | Theme, default mode, mode switch, branding, nav logo, nav title, nav links, footer nav, social links |
| `/settings/content/` | Content | Sidebar, TOC, content include/exclude/hide, redirects, raw link, RSS |
| `/settings/integrations/` | Integrations | GitHub, comments, giscus, search, analytics, umami, edit link |
| `/settings/access/` | Access & Domains | Custom domain, password protection |
| `/settings/billing/` | Billing & Danger Zone | Billing, delete site |

New fields (nav, theme, analytics, etc.) write via `site.updateConfigJson`.
Existing fields (comments, search, RSS, branding) continue via `site.update`.

## Migration Strategy

- Existing columns stay and keep working (no data migration)
- `configJson` is additive — new fields go here
- Old column cleanup is a separate follow-up task
- No breaking changes to the public `site.getConfig` response shape

## Out of Scope

- Dashboard UI showing the source of each setting (default / dashboard / config.json) — future improvement
- Removing or deprecating existing `Site` columns — follow-up task
