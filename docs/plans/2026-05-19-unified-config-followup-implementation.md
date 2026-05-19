# Unified Config Follow-up: Implementation Plan

**Goal:** Complete the unified config by (1) migrating nine Site columns into configJson, (2) adding JSON textarea editors for all array-valued fields, and (3) updating all public/API reads to use configJson.

**Design doc:** `docs/plans/2026-05-19-unified-config-followup-design.md`

---

## Task 1: Expand SiteConfigJson type

**File:** `apps/flowershow/components/types.ts`

Add to the `SiteConfigJson` interface (after `contentHide`):

```ts
  enableComments?: boolean;
  enableSearch?: boolean;
  enableRss?: boolean;
  showSidebar?: boolean;
  showBuiltWithButton?: boolean;
  showRawLink?: boolean;
  syntaxMode?: 'auto' | 'md' | 'mdx';
  giscus?: { repoId?: string; categoryId?: string };
```

**Verify:** `npx tsc --noEmit` — no new errors.

---

## Task 2: Prisma migration — copy columns into configJson

**File:** create `apps/flowershow/prisma/migrations/<timestamp>_migrate_columns_to_config_json/migration.sql`

Run:
```bash
cd apps/flowershow
npx prisma migrate dev --name migrate_columns_to_config_json
```

Then replace the auto-generated empty migration with this SQL:

```sql
-- Copy existing Site column values into config_json JSONB.
-- Right side (existing config_json) wins on key conflicts — preserves any values
-- that were already explicitly set via the dashboard.
UPDATE "Site"
SET "config_json" =
  jsonb_strip_nulls(jsonb_build_object(
    'enableComments',      "enable_comments",
    'enableSearch',        "enable_search",
    'enableRss',           "enable_rss",
    'showSidebar',         "show_sidebar",
    'showBuiltWithButton', "show_built_with_button",
    'showRawLink',         "show_raw_link",
    'syntaxMode',          "syntax_mode"::text,
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

**Verify:** In Prisma Studio, open the Site table. Confirm `config_json` now contains `enableComments`, `enableSearch`, etc. for existing rows.

---

## Task 3: Update public layout to read from siteConfig

**File:** `apps/flowershow/app/(public)/site/[user]/[project]/layout.tsx`

Lines ~151–155, replace:
```ts
const showBuiltWithButton = !canHideBuiltWith || site.showBuiltWithButton;
const showSearch =
  isFeatureEnabled(Feature.Search, site) && site.enableSearch;
const showNav = !!siteConfig?.nav || site.enableSearch || siteConfig?.social;
```
With:
```ts
const showBuiltWithButton =
  !canHideBuiltWith || (siteConfig?.showBuiltWithButton ?? true);
const showSearch =
  isFeatureEnabled(Feature.Search, site) && (siteConfig?.enableSearch ?? false);
const showNav =
  !!siteConfig?.nav || (siteConfig?.enableSearch ?? false) || !!siteConfig?.social;
```

**Verify:** Public site renders, search and branding button behave as expected.

---

## Task 4: Update public page to read from siteConfig

**File:** `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`

Four targeted replacements:

**4a. enableRss (~line 143)**
```ts
// Before:
...(site.enableRss && {
// After:
...((siteConfig?.enableRss ?? false) && {
```

**4b. syntaxMode (~line 240)**
```ts
// Before:
const renderMode = metadata?.syntaxMode ?? site.syntaxMode;
// After:
const renderMode = metadata?.syntaxMode ?? siteConfig?.syntaxMode ?? 'auto';
```

**4c. showRawLink, enableComments, giscus (~lines 372–379)**
```ts
// Before:
const showRawLink = site.showRawLink;
const showComments =
  site.enableComments &&
  (metadata?.showComments ?? siteConfig?.showComments ?? site.enableComments);
const giscusConfig = siteConfig?.giscus;

// After:
const showRawLink = siteConfig?.showRawLink ?? false;
const showComments =
  (siteConfig?.enableComments ?? false) &&
  (metadata?.showComments ?? siteConfig?.showComments ?? siteConfig?.enableComments ?? false);
const giscusConfig = siteConfig?.giscus;
```

**4d. showSidebar (~line 392)**
```ts
// Before:
metadata?.showSidebar ?? siteConfig?.showSidebar ?? site.showSidebar;
// After:
metadata?.showSidebar ?? siteConfig?.showSidebar ?? true;
```

**4e. giscus repoId/categoryId (~lines 500–502)**
```ts
// Before:
repoId={giscusConfig?.repoId ?? site.giscusRepoId ?? undefined}
categoryId={giscusConfig?.categoryId ?? site.giscusCategoryId ?? undefined}
// After:
repoId={giscusConfig?.repoId ?? undefined}
categoryId={giscusConfig?.categoryId ?? undefined}
```

**Verify:** TypeScript passes, page renders with comments/sidebar/raw link as before.

---

## Task 5: Update REST API — GET /api/sites/id/[siteId]

**File:** `apps/flowershow/app/api/sites/id/[siteId]/route.ts`

**5a.** Add `configJson: true` to the Prisma `select` block.

**5b.** Add import at top:
```ts
import type { SiteConfigJson } from '@/components/types';
```

**5c.** After the `const totalSize` line, extract configJson values:
```ts
const siteConfigJson = (site.configJson ?? {}) as SiteConfigJson;
```

**5d.** In the `GetSiteResponse` object, replace the four column reads:
```ts
// Before:
enableComments: site.enableComments,
enableSearch: site.enableSearch,
showSidebar: site.showSidebar,
syntaxMode: site.syntaxMode,

// After:
enableComments: siteConfigJson.enableComments ?? false,
enableSearch: siteConfigJson.enableSearch ?? false,
showSidebar: siteConfigJson.showSidebar ?? true,
syntaxMode: siteConfigJson.syntaxMode ?? 'auto',
```

**Verify:** TypeScript passes. The response shape matches `GetSiteResponse`.

---

## Task 6: Update REST API — GET /api/rss/[user]/[project]

**File:** `apps/flowershow/app/api/rss/[user]/[project]/route.ts`

**6a.** Add `configJson: true` to the `prisma.site.findFirst` include/select. Since this route uses `include: { user, blobs }`, add a `select`-compatible alternative or switch to a two-query approach:

Change:
```ts
const site = await prisma.site.findFirst({
  where: { ... },
  include: { user: true, blobs: { ... } },
});
```
To:
```ts
const site = await prisma.site.findFirst({
  where: { ... },
  include: { user: true, blobs: { ... } },
});
```
Then add a second read for configJson OR add it to the include:
```ts
// Add configJson to include is not possible since include doesn't accept scalar selection that way.
// Instead, fetch configJson separately:
const siteConfigRow = site ? await prisma.site.findUnique({
  where: { id: site.id },
  select: { configJson: true },
}) : null;
const siteConfigJson = (siteConfigRow?.configJson ?? {}) as SiteConfigJson;
```

**6b.** Replace:
```ts
if (!site.enableRss) {
// With:
if (!(siteConfigJson.enableRss ?? false)) {
```

**Note:** For a cleaner approach, add `configJson: true` directly to the Prisma `include` block using a raw `select` inside the `include` or switch to a combined query. The simplest change is to add it to a separate `select`:

Actually, the cleanest fix is to restructure the query to use `select` instead of `include`, explicitly listing all needed fields. But that's a larger refactor. The two-query approach above is simpler.

**Verify:** RSS feed works for sites with `enableRss: true` in configJson.

---

## Task 7: Update dashboard write paths

**Files:**
- `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/page.tsx` (General)
- `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/appearance/page.tsx`
- `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/content/page.tsx`
- `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/integrations/page.tsx`

### 7a. General — syntaxMode

In `page.tsx`, change the `syntaxMode` Form to use `updateConfigJson`:
```ts
// Change handleSubmit from updateSite to updateConfigJson
handleSubmit={updateConfigJson}
```
And change the default value read:
```ts
// Before: defaultValue: site.syntaxMode,
defaultValue: siteConfig?.syntaxMode ?? 'auto',
```

### 7b. Appearance — showBuiltWithButton

In `appearance/page.tsx`, change the "Show Flowershow Branding" Form:
- `handleSubmit={updateSite}` → `handleSubmit={updateConfigJson}`
- Default value: `Boolean(site.showBuiltWithButton).toString()` → `Boolean(siteConfig?.showBuiltWithButton ?? true).toString()`

Also add `updateConfigJson` server action (same pattern as other pages):
```ts
const updateConfigJson = async ({ id, key, value }: { id: string; key: string; value: string }) => {
  'use server';
  const parsed = value === 'true' ? true : value === 'false' ? false : value;
  const configValue = parsed === '' ? undefined : parsed;
  await api.site.updateConfigJson.mutate({ siteId: id, config: { [key]: configValue } });
};
```

### 7c. Content — showSidebar, enableRss, showRawLink

In `content/page.tsx`:
- `showSidebar`: change `handleSubmit` to `updateConfigJson`, default value to `Boolean(siteConfig?.showSidebar ?? true).toString()`
- `enableRss`: change `handleSubmit` to `updateConfigJson`, default value to `Boolean(siteConfig?.enableRss ?? false).toString()`
- `showRawLink`: change `handleSubmit` to `updateConfigJson`, default value to `Boolean(siteConfig?.showRawLink ?? false).toString()`

These are already toggle fields — the boolean parsing in `updateConfigJson` handles them.

### 7d. Integrations — enableComments, giscus, enableSearch

In `integrations/page.tsx`:
- `enableComments`: change `handleSubmit` to `updateConfigJson`, default value to `Boolean(siteConfig?.enableComments ?? false).toString()`
- `giscusRepoId`: change `handleSubmit` to a new `updateGiscusConfig` action that writes `{ giscus: { repoId: value } }`, default value to `siteConfig?.giscus?.repoId ?? ''`
- `giscusCategoryId`: same with `{ giscus: { categoryId: value } }`, default value to `siteConfig?.giscus?.categoryId ?? ''`
- `enableSearch`: change `handleSubmit` to `updateConfigJson`, default value to `Boolean(siteConfig?.enableSearch ?? false).toString()`

Add a dedicated `updateGiscusConfig` server action:
```ts
const updateGiscusConfig = async ({ id, key, value }: { id: string; key: string; value: string }) => {
  'use server';
  await api.site.updateConfigJson.mutate({ siteId: id, config: { giscus: { [key]: value || undefined } } });
};
```

Also update the conditional rendering of giscus fields — currently gated on `site?.enableComments`:
```ts
// Before:
{site?.enableComments && (
// After:
{(siteConfig?.enableComments ?? false) && (
```

**Verify:** TypeScript passes. Toggle each field in the dashboard, confirm it persists on reload.

---

## Task 8: Create JsonForm component

**File:** `apps/flowershow/components/dashboard/json-form.tsx`

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';

export default function JsonForm({
  title,
  description,
  helpText,
  fieldName,
  defaultValue,
  handleSubmit,
}: {
  title: string;
  description: string;
  helpText?: string;
  fieldName: string;
  defaultValue: unknown;
  handleSubmit: (id: string, value: unknown) => Promise<void>;
}) {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [text, setText] = useState(
    defaultValue != null ? JSON.stringify(defaultValue, null, 2) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let parsed: unknown;
    if (text.trim() === '') {
      parsed = null;
    } else {
      try {
        parsed = JSON.parse(text);
      } catch (err: any) {
        setError(`Invalid JSON: ${err.message}`);
        return;
      }
    }

    try {
      setPending(true);
      await handleSubmit(id, parsed);
      router.refresh();
      toast.success(`${title} updated.`);
    } catch (err: any) {
      toast.error(`Error: ${err?.message ?? 'Failed to update.'}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      data-testid={`config-${fieldName}`}
      onSubmit={onSubmit}
      className="isolate rounded-lg border border-stone-200 bg-white"
    >
      <div className="flex flex-col space-y-4 p-5 sm:p-10">
        <h2 className="font-dashboard-heading text-xl">{title}</h2>
        <p className="text-sm text-stone-500">{description}</p>
        <textarea
          rows={6}
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          disabled={pending}
          placeholder="null"
          className="w-full rounded-md border border-stone-300 font-mono text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <div className="flex items-center justify-between rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 sm:px-10">
        <div className="text-sm text-stone-500">{helpText}</div>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'flex h-8 w-32 shrink-0 items-center justify-center space-x-2 rounded-md border px-2 py-1 text-sm transition-all focus:outline-none sm:h-10',
            pending
              ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
              : 'border-black bg-black text-white hover:bg-white hover:text-black',
          )}
          data-testid={`save-${fieldName}`}
        >
          {pending ? <LoadingDots color="#808080" /> : <p>Save Changes</p>}
        </button>
      </div>
    </form>
  );
}
```

---

## Task 9: Add JSON editors to Appearance page

**File:** `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/appearance/page.tsx`

Add three `JsonForm` fields (after existing Form fields):

**9a. Nav Links**
```tsx
<JsonForm
  title="Nav Links"
  description="Navigation items shown in the header. Each item needs 'name' and 'href'. Dropdowns use 'name' and 'links' (array of {name, href})."
  helpText='Example: [{"name":"Blog","href":"/blog"}]'
  fieldName="nav.links"
  defaultValue={siteConfig?.nav?.links ?? null}
  handleSubmit={async (id, value) => {
    'use server';
    await api.site.updateConfigJson.mutate({ siteId: id, config: { nav: { links: value as any } } });
  }}
/>
```

**9b. Social Links**
```tsx
<JsonForm
  title="Social Links"
  description='Social platform links shown in the nav and footer. Each item needs "name", "href", and optionally "label" (platform name, e.g. "github", "twitter").'
  helpText='Example: [{"name":"GitHub","href":"https://github.com/you","label":"github"}]'
  fieldName="social"
  defaultValue={siteConfig?.social ?? null}
  handleSubmit={async (id, value) => {
    'use server';
    await api.site.updateConfigJson.mutate({ siteId: id, config: { social: value as any } });
  }}
/>
```

**9c. Footer Navigation**
```tsx
<JsonForm
  title="Footer Navigation"
  description='Navigation groups shown in the footer. Each group needs "title" and "links" (array of {name, href}).'
  helpText='Example: [{"title":"Docs","links":[{"name":"Getting Started","href":"/docs"}]}]'
  fieldName="footer.navigation"
  defaultValue={siteConfig?.footer?.navigation ?? null}
  handleSubmit={async (id, value) => {
    'use server';
    await api.site.updateConfigJson.mutate({ siteId: id, config: { footer: { navigation: value as any } } });
  }}
/>
```

**Note:** Server actions in RSC cannot be inline lambdas when they call tRPC — extract them to named `async function` with `'use server'` at the top of the function. Or use the existing `updateConfigJson` server action in the page and pass a wrapper.

Actually, the server actions need to be defined at the top level of the page component. For nested keys like `nav.links`, define a specific server action:

```ts
const updateNavLinks = async ({ id, value }: { id: string; value: unknown }) => {
  'use server';
  await api.site.updateConfigJson.mutate({ siteId: id, config: { nav: { links: value as any } } });
};
```

Then `<JsonForm handleSubmit={updateNavLinks} />`.

---

## Task 10: Add JSON editors to Content page

**File:** `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/content/page.tsx`

Add five `JsonForm` fields:

Server actions:
```ts
const updateContentInclude = async ({ id, value }: { id: string; value: unknown }) => {
  'use server';
  await api.site.updateConfigJson.mutate({ siteId: id, config: { contentInclude: value as any } });
};
const updateContentExclude = async ({ id, value }: { id: string; value: unknown }) => {
  'use server';
  await api.site.updateConfigJson.mutate({ siteId: id, config: { contentExclude: value as any } });
};
const updateContentHide = async ({ id, value }: { id: string; value: unknown }) => {
  'use server';
  await api.site.updateConfigJson.mutate({ siteId: id, config: { contentHide: value as any } });
};
const updateSidebarPaths = async ({ id, value }: { id: string; value: unknown }) => {
  'use server';
  await api.site.updateConfigJson.mutate({ siteId: id, config: { sidebar: { paths: value as any } } });
};
const updateRedirects = async ({ id, value }: { id: string; value: unknown }) => {
  'use server';
  await api.site.updateConfigJson.mutate({ siteId: id, config: { redirects: value as any } });
};
```

Fields:
- Content Include — `fieldName="contentInclude"`, `defaultValue={siteConfig?.contentInclude ?? null}`
- Content Exclude — `fieldName="contentExclude"`, `defaultValue={siteConfig?.contentExclude ?? null}`
- Content Hide — `fieldName="contentHide"`, `defaultValue={siteConfig?.contentHide ?? null}`
- Sidebar Paths — `fieldName="sidebar.paths"`, `defaultValue={siteConfig?.sidebar?.paths ?? null}`
- Redirects — `fieldName="redirects"`, `defaultValue={siteConfig?.redirects ?? null}`

---

## Task 11: Write config precedence documentation

**File:** `apps/flowershow/content/docs/site-settings.md` (or wherever the existing site settings docs live — locate first)

Add a section:

```markdown
## Configuration Precedence

Flowershow merges settings from three layers, in order:

1. **Defaults** — built-in defaults applied to every site
2. **Dashboard** — values saved in the Flowershow dashboard
3. **config.json** — your site's `config.json` file in the repository

Later layers win. If you set a value in `config.json`, it always overrides the dashboard value for that field. This means you can use the dashboard for most settings and override specific ones per-site in `config.json`.
```

---

## Verification Checklist

After all tasks:

```bash
# TypeScript
cd apps/flowershow && npx tsc --noEmit

# Unit tests
pnpm -F @flowershow/app run test:unit

# Manual smoke test
# 1. Open dashboard → settings → each page, verify field defaults load correctly
# 2. Toggle "Show Sidebar" off → reload public site → sidebar gone
# 3. Set a nav link via JSON editor → reload public site → nav link appears
# 4. Set analytics GA ID → public site head has GoogleAnalytics
# 5. Giscus settings save and appear on public page
```
