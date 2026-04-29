# Unified Site Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a unified site configuration model where `config.json` overrides dashboard settings, all stored in a `configJson` JSONB column, with a restructured dashboard split into six settings sections.

**Architecture:** Add `configJson JSONB` to the `Site` model → `resolveSiteConfig()` merges defaults + DB configJson + file config.json → `site.getConfig` returns the merged result → public layout consumes it → dashboard settings split into six route pages.

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL, tRPC, Vitest, React (headlessui for toggles), Zod

---

### Task 1: Add `configJson` column via Prisma migration

**Files:**
- Modify: `apps/flowershow/prisma/schema.prisma:107-151`

**Step 1: Add the field to the schema**

In `schema.prisma`, add this line after `showRawLink` (line 136), before the anonymous fields block:

```prisma
  configJson              Json?         @default("{}") @map("config_json") @db.JsonB
```

**Step 2: Create the migration**

```bash
cd apps/flowershow
npx prisma migrate dev --name add_config_json
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

**Step 3: Verify**

```bash
npx prisma studio
```

Open the Site table, confirm `config_json` column exists with default `{}`.

**Step 4: Commit**

```bash
git add apps/flowershow/prisma/schema.prisma apps/flowershow/prisma/migrations/
git commit -m "feat(db): add configJson JSONB column to Site"
```

---

### Task 2: Add `SiteConfigJson` type

**Files:**
- Modify: `apps/flowershow/components/types.ts:62`

**Step 1: Add `SiteConfigJson` interface after the existing `SiteConfig` interface (after line 108)**

```typescript
/**
 * Subset of SiteConfig that can be stored as dashboard configuration in the DB.
 * Does NOT include fields already covered by dedicated Site columns
 * (enableComments, enableSearch, enableRss, showSidebar, showBuiltWithButton,
 * showRawLink, syntaxMode, giscusRepoId, giscusCategoryId).
 */
export interface SiteConfigJson {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  nav?: NavConfig;
  footer?: FooterConfig;
  social?: SocialLink[];
  analytics?: string;
  umami?: string | { websiteId: string; src?: string };
  showToc?: boolean;
  sidebar?: {
    orderBy?: 'title' | 'path';
    paths?: string[];
  };
  showEditLink?: boolean;
  theme?: string | ThemeConfig;
  redirects?: Array<{
    from: string;
    to: string;
    permanent?: boolean;
  }>;
  contentInclude?: string[];
  contentExclude?: string[];
  contentHide?: string[];
}
```

**Step 2: Commit**

```bash
git add apps/flowershow/components/types.ts
git commit -m "feat(types): add SiteConfigJson interface"
```

---

### Task 3: Create `resolveSiteConfig` utility with tests

**Files:**
- Create: `apps/flowershow/lib/site-config.ts`
- Create: `apps/flowershow/lib/site-config.test.ts`

**Step 1: Write the failing tests first**

Create `apps/flowershow/lib/site-config.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { resolveSiteConfig } from './site-config';

describe('resolveSiteConfig', () => {
  it('returns empty object when all inputs are null', () => {
    expect(resolveSiteConfig(null, null)).toEqual({});
  });

  it('returns dbConfig when fileConfig is null', () => {
    const db = { title: 'From DB', showToc: true };
    expect(resolveSiteConfig(db, null)).toEqual({ title: 'From DB', showToc: true });
  });

  it('returns fileConfig when dbConfig is null', () => {
    const file = { title: 'From File', showToc: false };
    expect(resolveSiteConfig(null, file)).toEqual({ title: 'From File', showToc: false });
  });

  it('fileConfig scalar fields override dbConfig', () => {
    const db = { title: 'DB Title', showToc: true };
    const file = { title: 'File Title' };
    const result = resolveSiteConfig(db, file);
    expect(result.title).toBe('File Title');
    expect(result.showToc).toBe(true); // DB value preserved when file doesn't set it
  });

  it('deep merges nested objects: fileConfig.nav overrides dbConfig.nav keys', () => {
    const db = { nav: { title: 'DB Nav Title', logo: '/logo.png' } };
    const file = { nav: { title: 'File Nav Title' } };
    const result = resolveSiteConfig(db, file);
    expect(result.nav?.title).toBe('File Nav Title');
    expect(result.nav?.logo).toBe('/logo.png'); // DB key preserved when file doesn't set it
  });

  it('deep merges theme objects', () => {
    const db = { theme: { theme: 'dark', defaultMode: 'light' as const, showModeSwitch: true } };
    const file = { theme: { defaultMode: 'dark' as const } };
    const result = resolveSiteConfig(db, file);
    expect(result.theme).toEqual({ theme: 'dark', defaultMode: 'dark', showModeSwitch: true });
  });

  it('fileConfig arrays completely replace dbConfig arrays', () => {
    const db = { contentInclude: ['notes/', 'blog/'] };
    const file = { contentInclude: ['posts/'] };
    const result = resolveSiteConfig(db, file);
    expect(result.contentInclude).toEqual(['posts/']);
  });

  it('handles fileConfig theme as string overriding db theme object', () => {
    const db = { theme: { theme: 'midnight', defaultMode: 'dark' as const } };
    const file = { theme: 'forest' };
    const result = resolveSiteConfig(db, file);
    expect(result.theme).toBe('forest');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/flowershow
npx vitest run lib/site-config.test.ts
```

Expected: all tests fail with "Cannot find module './site-config'"

**Step 3: Implement `resolveSiteConfig`**

Create `apps/flowershow/lib/site-config.ts`:

```typescript
import type { SiteConfig, SiteConfigJson, ThemeConfig } from '@/components/types';

type ResolvableConfig = SiteConfigJson | SiteConfig | null | undefined;

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as Array<keyof T>) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>,
      ) as T[typeof key];
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[typeof key];
    }
  }
  return result;
}

/**
 * Merges dashboard DB config (configJson) with file-based config (config.json).
 * File config wins: config.json overrides dashboard values.
 * Nested objects are deep-merged; arrays are replaced wholesale.
 */
export function resolveSiteConfig(
  dbConfig: ResolvableConfig,
  fileConfig: ResolvableConfig,
): SiteConfigJson {
  const base = (dbConfig ?? {}) as SiteConfigJson;
  const override = (fileConfig ?? {}) as SiteConfigJson;

  if (!dbConfig && !fileConfig) return {};
  if (!dbConfig) return override;
  if (!fileConfig) return base;

  return deepMerge(base as Record<string, unknown>, override as Record<string, unknown>) as SiteConfigJson;
}
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/flowershow
npx vitest run lib/site-config.test.ts
```

Expected: all 8 tests pass.

**Step 5: Commit**

```bash
git add apps/flowershow/lib/site-config.ts apps/flowershow/lib/site-config.test.ts
git commit -m "feat(lib): add resolveSiteConfig utility"
```

---

### Task 4: Add `site.updateConfigJson` TRPC mutation

**Files:**
- Modify: `apps/flowershow/server/api/routers/site.ts:1` (imports), and after the `update` mutation (~line 234)
- Modify: `apps/flowershow/components/types.ts` (no change, already done)

**Step 1: Add the import at the top of site.ts**

After the existing `SiteConfig` import on line 6, add `SiteConfigJson`:

```typescript
import { isNavDropdown, SiteConfig, SiteConfigJson } from '@/components/types';
```

**Step 2: Add the mutation after the `update` mutation**

Find the end of the `update` mutation in `site.ts` (around line 500+). Add the new mutation immediately after it:

```typescript
  updateConfigJson: protectedProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        config: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        select: { id: true, userId: true, configJson: true },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      const existing = (site.configJson ?? {}) as Record<string, unknown>;
      const patch = input.config as Record<string, unknown>;

      // Deep merge patch into existing configJson
      const merged = deepMergeObjects(existing, patch);

      await ctx.db.site.update({
        where: { id: input.siteId },
        data: { configJson: merged },
      });

      revalidateTag(input.siteId);
      revalidateTag(`${input.siteId}-config`);
    }),
```

**Step 3: Add `deepMergeObjects` helper at the top of site.ts (after imports)**

```typescript
function deepMergeObjects(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (
      typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal) &&
      typeof overrideVal === 'object' && overrideVal !== null && !Array.isArray(overrideVal)
    ) {
      result[key] = deepMergeObjects(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>,
      );
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal;
    }
  }
  return result;
}
```

**Step 4: Verify TypeScript compiles**

```bash
cd apps/flowershow
npx tsc --noEmit
```

Expected: no errors related to the new mutation.

**Step 5: Commit**

```bash
git add apps/flowershow/server/api/routers/site.ts
git commit -m "feat(api): add site.updateConfigJson TRPC mutation"
```

---

### Task 5: Update `site.getConfig` to merge DB configJson with file config

**Files:**
- Modify: `apps/flowershow/server/api/routers/site.ts:812-956` (getConfig procedure)

**Step 1: Add the import for resolveSiteConfig**

At the top of `site.ts`, add:

```typescript
import { resolveSiteConfig } from '@/lib/site-config';
```

**Step 2: Update the `getConfig` procedure**

The current `getConfig` (lines 812-956) fetches the site without selecting `configJson`. Update the `findUnique` call and return value:

Change the `findUnique` call (around line 821) to also select `configJson`:

```typescript
const site = await ctx.db.site.findUnique({
  where: { id: input.siteId },
  select: {
    id: true,
    customDomain: true,
    subdomain: true,
    configJson: true,
    user: { select: { username: true } },
  },
});
```

Then, at the end of the try block (currently `return config;` on line 945), replace with:

```typescript
            const dbConfigJson = (site.configJson ?? null) as SiteConfigJson | null;
            return resolveSiteConfig(dbConfigJson, config);
```

And change the early return when config is null (line 846-847) to:

```typescript
            if (!config) {
              const dbConfigJson = (site.configJson ?? null) as SiteConfigJson | null;
              return dbConfigJson ? resolveSiteConfig(dbConfigJson, null) : null;
            }
```

**Step 3: Verify TypeScript**

```bash
cd apps/flowershow
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add apps/flowershow/server/api/routers/site.ts
git commit -m "feat(api): merge DB configJson with file config in site.getConfig"
```

---

### Task 6: Update public layout to use resolved config

**Files:**
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/layout.tsx:109-155`

The layout currently reads `siteConfig` from `api.site.getConfig` and then manually resolves values with `??` chains. Since `getConfig` now returns the already-merged config, the layout logic simplifies.

**Step 1: Update the `siteConfig` consumption block (lines 126-155)**

The theme extraction (lines 126-144) and the nav extraction (lines 146-155) remain identical — the resolved config is the same shape as before. No changes are required here because `getConfig` returns the merged `SiteConfigJson` which has the same shape as `SiteConfig`.

Verify that existing `??` fallbacks in the layout still work correctly with the merged config. The layout already does:
- `siteConfig?.nav?.logo ?? siteConfig?.logo ?? appConfig.logo` — this still works since the merged config may have either
- Theme extraction — unchanged

**Step 2: Manual smoke test**

Start the dev server and load a public site that has a `config.json`. Verify the site renders correctly.

```bash
cd apps/flowershow
npm run dev
```

**Step 3: Commit**

```bash
git add apps/flowershow/app/\(public\)/site/\[user\]/\[project\]/layout.tsx
git commit -m "refactor(layout): consume resolved config from getConfig"
```

---

### Task 7: Restructure settings routes — create new page skeletons

**Files:**
- Create: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/content/page.tsx`
- Create: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/integrations/page.tsx`
- Create: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/access/page.tsx`
- Create: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/billing/page.tsx`

(Note: `appearance/` already exists as `_page.tsx` — rename it to `page.tsx` in Task 9.)

**Step 1: Create `content/page.tsx` skeleton**

```typescript
// apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/content/page.tsx
import { notFound } from 'next/navigation';
import SettingsNav from '@/components/dashboard/settings-nav';
import { api } from '@/trpc/server';

export default async function ContentSettingsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const site = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  if (!site) notFound();

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        <p className="text-sm text-stone-500">Content settings coming soon.</p>
      </div>
    </div>
  );
}
```

**Step 2: Create the other three skeletons** following the same pattern for `integrations/page.tsx`, `access/page.tsx`, `billing/page.tsx`.

**Step 3: Verify routes resolve**

Start dev server and navigate to each new route, confirm they render without 404.

**Step 4: Commit**

```bash
git add apps/flowershow/app/\(cloud\)/dashboard/site/\[id\]/settings/
git commit -m "feat(dashboard): add skeleton pages for new settings sections"
```

---

### Task 8: Update `SettingsNav` to route-based navigation

**Files:**
- Modify: `apps/flowershow/components/dashboard/settings-nav.tsx`

**Step 1: Replace anchor-link nav items with route links**

The current nav uses `href: '#anchor'` links within a single page. Replace with actual routes:

```typescript
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const navSections = [
  { name: 'General', href: '' },
  { name: 'Appearance', href: '/appearance' },
  { name: 'Content', href: '/content' },
  { name: 'Integrations', href: '/integrations' },
  { name: 'Access & Domains', href: '/access' },
  { name: 'Billing', href: '/billing' },
];

interface SettingsNavProps {
  hasGhRepository?: boolean;
}

export default function SettingsNav({ hasGhRepository }: SettingsNavProps) {
  const { id } = useParams() as { id: string };
  const pathname = usePathname();
  const base = `/dashboard/site/${id}/settings`;

  return (
    <ul className="border-primary-silent space-y-2 rounded-md border px-4 py-5">
      {navSections.map((section) => {
        const href = `${base}${section.href}`;
        const isActive = pathname === href;
        return (
          <li className="w-full" key={section.name}>
            <Link
              href={href}
              className={`block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-primary-faint/70 ${isActive ? 'bg-primary-faint/70' : ''}`}
            >
              {section.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

Note: This requires adding `'use client'` at the top since `useParams` and `usePathname` are client hooks.

**Step 2: Verify nav renders and links work**

Start dev server, navigate to settings pages, confirm the nav highlights the active section.

**Step 3: Commit**

```bash
git add apps/flowershow/components/dashboard/settings-nav.tsx
git commit -m "feat(dashboard): convert SettingsNav to route-based navigation"
```

---

### Task 9: Refactor main settings page into General

**Files:**
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/page.tsx`

**Step 1: Keep only General-section fields**

The current page contains: Name, Syntax Mode, GitHub, Auto-sync, Comments, Giscus, Custom Domain, Search, RSS, Branding, Raw Link, Password, Billing, Delete.

Remove everything except Name and Syntax Mode. Add forms for the new configJson fields: Title, Description, Favicon, Social Image.

The new General page should have:
1. Name (existing `Form` → `site.update`)
2. Syntax Mode (existing `Form` → `site.update`)
3. Title (new `Form` → `site.updateConfigJson`)
4. Description (new `Form` → `site.updateConfigJson`)
5. Favicon (new `Form` → `site.updateConfigJson`)
6. Social Image (new `Form` → `site.updateConfigJson`)

**Step 2: Add server actions for configJson fields**

In the settings page, add a second server action:

```typescript
const updateConfigJson = async ({
  id,
  key,
  value,
}: {
  id: string;
  key: string;
  value: string;
}) => {
  'use server';
  await api.site.updateConfigJson.mutate({
    siteId: id,
    config: { [key]: value || undefined },
  });
};
```

The `Form` component's `handleSubmit` prop is typed as accepting `SiteUpdateKey`, but we need to accept arbitrary string keys for configJson. Update the `handleSubmit` type in `Form` to accept `string` instead of `SiteUpdateKey` (or create a typed wrapper). The simplest fix: cast `key` in the server action call.

**Step 3: Read `configJson` for default values**

In the page component, fetch configJson alongside the site:

```typescript
const siteConfig = await api.site.getConfig.query({ siteId: site.id }).catch(() => null);
```

Use `siteConfig?.title`, `siteConfig?.description`, etc. as default values for the new forms.

**Step 4: Commit**

```bash
git add apps/flowershow/app/\(cloud\)/dashboard/site/\[id\]/settings/page.tsx
git commit -m "feat(dashboard): refactor settings page to General section"
```

---

### Task 10: Build Integrations settings page

**Files:**
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/integrations/page.tsx`

Move these fields from the old settings page to Integrations:
- GitHub Integration (existing `GitHubConnectionForm`)
- Auto-sync (existing `Form` → `site.update`)
- Comments (existing `Form` → `site.update`)
- Giscus Repo ID (existing `Form` → `site.update`)
- Giscus Category ID (existing `Form` → `site.update`)
- Full-Text Search (existing `Form` → `site.update`)
- Analytics (new `Form` → `site.updateConfigJson` with key `analytics`)
- Show Edit Link (new toggle `Form` → `site.updateConfigJson` with key `showEditLink`)

For Analytics, use a text input for the Google Analytics ID (string).
For Show Edit Link, use a toggle (same pattern as `enableComments`).

**Step 1: Build the full page**

Copy the server action pattern from the current `settings/page.tsx`. Add both `updateSite` (for column fields) and `updateConfigJson` (for new fields) server actions. Wire up all forms.

**Step 2: Verify**

Start dev server. Navigate to `/settings/integrations`. Test toggling comments and search. Test saving an analytics ID.

**Step 3: Commit**

```bash
git add apps/flowershow/app/\(cloud\)/dashboard/site/\[id\]/settings/integrations/page.tsx
git commit -m "feat(dashboard): build Integrations settings page"
```

---

### Task 11: Build Appearance settings page

**Files:**
- Rename: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/appearance/_page.tsx` → `page.tsx`
- Modify: the renamed file

The appearance `_page.tsx` exists but is stubbed out. Replace its content with:
- Nav Title (`nav.title`) — text input → configJson
- Theme Name (`theme.theme`) — text input → configJson (nested: `{ theme: { theme: value } }`)
- Default Mode (`theme.defaultMode`) — select (light/dark/system) → configJson (nested)
- Show Mode Switch (`theme.showModeSwitch`) — toggle → configJson (nested)
- Branding / Show Built With Button (existing toggle → `site.update`)

For nested theme fields, the server action needs to build the nested object:

```typescript
const updateThemeConfig = async ({
  id,
  key,
  value,
}: {
  id: string;
  key: 'theme' | 'defaultMode' | 'showModeSwitch';
  value: string;
}) => {
  'use server';
  const parsed = value === 'true' ? true : value === 'false' ? false : value;
  await api.site.updateConfigJson.mutate({
    siteId: id,
    config: { theme: { [key]: parsed } },
  });
};
```

**Step 1: Rename `_page.tsx` to `page.tsx`**

```bash
cd apps/flowershow/app/\(cloud\)/dashboard/site/\[id\]/settings/appearance
mv _page.tsx page.tsx
```

**Step 2: Build the full page content**

Replace the stub content with the actual forms described above.

**Step 3: Verify**

Navigate to `/settings/appearance`. Test saving a theme name. Reload the public site to confirm it renders with the new theme.

**Step 4: Commit**

```bash
git add apps/flowershow/app/\(cloud\)/dashboard/site/\[id\]/settings/appearance/
git commit -m "feat(dashboard): build Appearance settings page"
```

---

### Task 12: Build Content settings page

**Files:**
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/content/page.tsx`

Move/add these fields:
- Show Table of Contents (`showToc`) — toggle → configJson
- Show Sidebar (`showSidebar`) — toggle → `site.update` (existing column)
- RSS Feed (`enableRss`) — toggle → `site.update` (existing column)
- Show Raw Markdown Link (`showRawLink`) — toggle → `site.update` (existing column)

For `showToc`, the server action:

```typescript
const updateConfigJson = async ({ id, key, value }: { id: string; key: string; value: string }) => {
  'use server';
  const parsed = value === 'true' ? true : value === 'false' ? false : value;
  await api.site.updateConfigJson.mutate({ siteId: id, config: { [key]: parsed } });
};
```

**Step 1: Build the page**

**Step 2: Verify toggles work**

**Step 3: Commit**

```bash
git add apps/flowershow/app/\(cloud\)/dashboard/site/\[id\]/settings/content/page.tsx
git commit -m "feat(dashboard): build Content settings page"
```

---

### Task 13: Build Access & Domains and Billing settings pages

**Files:**
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/access/page.tsx`
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/billing/page.tsx`

**Access page** — move from old settings page:
- Custom Domain (existing `Form` → `site.update`)
- Password Protection (existing `SitePasswordProtectionForm`)

**Billing page** — move from old settings page:
- Billing (existing `Billing` component)
- Delete Site (existing `DeleteSiteForm`)

Both pages follow the same server action + Form component pattern already established.

**Step 1: Build access/page.tsx**

**Step 2: Build billing/page.tsx**

**Step 3: Verify both pages render correctly**

**Step 4: Commit**

```bash
git add apps/flowershow/app/\(cloud\)/dashboard/site/\[id\]/settings/
git commit -m "feat(dashboard): build Access and Billing settings pages"
```

---

### Task 14: Remove the "config.json notice" and clean up

**Files:**
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/page.tsx`

The current settings page has a notice (lines 325-341):
> "Not all site configuration is controlled via the dashboard. Some features are configured via config.json file."

Since all settings are now in the dashboard, remove this notice.

Also verify the old settings page no longer contains forms that were moved to other sections (no duplicate forms).

**Step 1: Remove the notice block from the General page**

**Step 2: Run TypeScript check**

```bash
cd apps/flowershow
npx tsc --noEmit
```

**Step 3: Run unit tests**

```bash
cd apps/flowershow
npm run test:unit
```

Expected: all pass.

**Step 4: Commit**

```bash
git add apps/flowershow/app/\(cloud\)/dashboard/site/\[id\]/settings/page.tsx
git commit -m "chore(dashboard): remove config.json notice from settings"
```

---

## Notes

- **Complex array fields** (`nav.links`, `footer.navigation`, `social`, `redirects`, `contentInclude/Exclude/Hide`, `sidebar.paths`) are in the `SiteConfigJson` type and fully supported by the backend merge logic. Their dashboard UI (array editors) is a follow-up task.
- **Config source indicator** (showing which value came from default/dashboard/config.json) is a future UX improvement and not part of this plan.
- **Existing columns** (`enableComments`, `enableSearch`, etc.) stay as-is. Their cleanup into configJson is a separate follow-up migration.
- The `Form` component's `handleSubmit` type uses `SiteUpdateKey`. For configJson fields, cast `key` to `string` in the server action to avoid type errors, or widen the type in the Form component.
