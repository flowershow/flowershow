# Subdomain URL Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Flowershow site URLs from `my.flowershow.app/@user/project` to `project-user.flowershow.site`, storing auto-assigned subdomains in the DB.

**Architecture:** Add `NEXT_PUBLIC_SITE_DOMAIN` env var; update `getSiteUrl()` to use `subdomain` field; remove `getSiteUrlPath()` (replace with `''` everywhere — all sites now serve at the root of their hostname); add `_subdomain` lookup in the site API; redirect old paths in middleware; backfill existing sites with a one-time migration script.

**Tech Stack:** Next.js 14, Prisma (PostgreSQL), TypeScript, Zod, Vitest

---

### Task 1: Add NEXT_PUBLIC_SITE_DOMAIN env var

**Files:**
- Modify: `apps/flowershow/env.mjs`
- Modify: `apps/flowershow/.env.example`

**Step 1: Add to env.mjs client schema**

In `env.mjs`, the `client` block has public vars (around line 72 where `NEXT_PUBLIC_ROOT_DOMAIN` lives). Add after `NEXT_PUBLIC_ROOT_DOMAIN`:

```js
NEXT_PUBLIC_SITE_DOMAIN: z.string(),
```

And in the `runtimeEnv` block (around line 96), add:

```js
NEXT_PUBLIC_SITE_DOMAIN: process.env.NEXT_PUBLIC_SITE_DOMAIN,
```

**Step 2: Add to .env.example**

After the line `NEXT_PUBLIC_ROOT_DOMAIN=my.localhost:3000`, add:

```
NEXT_PUBLIC_SITE_DOMAIN=localhost:3000
```

(In production this will be `flowershow.site`.)

**Step 3: Verify app still builds**

```bash
cd apps/flowershow && pnpm build 2>&1 | tail -5
```

Expected: no env validation errors (or just skip-validation for the check).

**Step 4: Commit**

```bash
git add apps/flowershow/env.mjs apps/flowershow/.env.example
git commit -m "feat: add NEXT_PUBLIC_SITE_DOMAIN env var"
```

---

### Task 2: Update getSiteUrl() and remove getSiteUrlPath()

**Files:**
- Modify: `apps/flowershow/lib/get-site-url.ts`
- Create: `apps/flowershow/lib/get-site-url.test.ts`

**Step 1: Write the failing tests**

Create `apps/flowershow/lib/get-site-url.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'production',
    NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.site',
    NEXT_PUBLIC_ROOT_DOMAIN: 'my.flowershow.app',
  },
}));

// Must import AFTER mocking
const { getSiteUrl } = await import('./get-site-url');

const baseSite = {
  projectName: 'garden',
  customDomain: null,
  subdomain: 'garden-johndoe',
  plan: 'FREE' as const,
  user: { username: 'johndoe' },
};

describe('getSiteUrl', () => {
  it('returns subdomain URL for a site with a subdomain', () => {
    expect(getSiteUrl(baseSite)).toBe('https://garden-johndoe.flowershow.site');
  });

  it('returns custom domain URL when site has custom domain and PREMIUM plan', () => {
    expect(
      getSiteUrl({ ...baseSite, customDomain: 'my.custom.com', plan: 'PREMIUM' }),
    ).toBe('https://my.custom.com');
  });

  it('falls back to my.flowershow.app path when no subdomain', () => {
    expect(getSiteUrl({ ...baseSite, subdomain: null })).toBe(
      'https://my.flowershow.app/@johndoe/garden',
    );
  });

  it('uses http in non-production env', async () => {
    vi.doMock('@/env.mjs', () => ({
      env: {
        NEXT_PUBLIC_VERCEL_ENV: undefined,
        NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.site',
        NEXT_PUBLIC_ROOT_DOMAIN: 'my.flowershow.app',
      },
    }));
    const { getSiteUrl: getSiteUrlLocal } = await import('./get-site-url');
    expect(getSiteUrlLocal(baseSite)).toBe(
      'http://garden-johndoe.flowershow.site',
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/flowershow && pnpm test lib/get-site-url.test.ts
```

Expected: FAIL (getSiteUrl doesn't handle subdomain yet)

**Step 3: Rewrite get-site-url.ts**

Replace the entire file `apps/flowershow/lib/get-site-url.ts`:

```typescript
import { Plan } from '@prisma/client';
import { env } from '@/env.mjs';
import { Feature, isFeatureEnabled } from './feature-flags';
import { resolveSiteAlias } from './resolve-site-alias';

type SiteWithUrl = {
  projectName: string;
  customDomain: string | null;
  subdomain: string | null;
  plan: Plan;
  user: { username: string };
};

export function getSiteUrl(site: SiteWithUrl) {
  const { customDomain, subdomain } = site;

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';

  if (isFeatureEnabled(Feature.CustomDomain, site) && customDomain) {
    return `${protocol}://${customDomain}`;
  }

  if (subdomain) {
    return `${protocol}://${subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;
  }

  // Fallback for sites without a subdomain (pre-migration safety net)
  const sitePath = resolveSiteAlias(
    `/@${site.user.username}/${site.projectName}`,
    'to',
  );
  return `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${sitePath}`;
}
```

Note: `getSiteUrlPath` is intentionally removed. All callers will be updated to use `''` (Tasks 5–7).

**Step 4: Run tests to verify they pass**

```bash
cd apps/flowershow && pnpm test lib/get-site-url.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/flowershow/lib/get-site-url.ts apps/flowershow/lib/get-site-url.test.ts
git commit -m "feat: update getSiteUrl to use subdomain, remove getSiteUrlPath"
```

---

### Task 3: Update API contract schemas

**Files:**
- Modify: `packages/api-contract/src/schemas.ts`

**Step 1: Add subdomain to SiteSummarySchema (line ~6)**

Change:

```typescript
export const SiteSummarySchema = z.object({
  id: z.string(),
  projectName: z.string(),
  url: z.string(),
  fileCount: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
});
```

To:

```typescript
export const SiteSummarySchema = z.object({
  id: z.string(),
  projectName: z.string(),
  subdomain: z.string().nullable(),
  url: z.string(),
  fileCount: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
});
```

**Step 2: Add subdomain to SiteDetailSchema (line ~28)**

After `customDomain: z.string().nullable(),`, add:

```typescript
subdomain: z.string().nullable(),
```

**Step 3: Build api-contract package**

```bash
cd packages/api-contract && pnpm build
```

Expected: builds successfully

**Step 4: Commit**

```bash
git add packages/api-contract/src/schemas.ts
git commit -m "feat(api-contract): add subdomain field to SiteDetail and SiteSummary schemas"
```

---

### Task 4: Add subdomain to internalSiteSelect

**Files:**
- Modify: `apps/flowershow/lib/db/internal.ts`

**Step 1: Add subdomain to internalSiteSelect**

After `customDomain: true,`, add:

```typescript
subdomain: true,
```

This makes `subdomain` available in middleware and all places that use `InternalSite`.

**Step 2: Run tests**

```bash
cd apps/flowershow && pnpm test
```

Expected: all 334 tests still pass (type-only change with no logic impact)

**Step 3: Commit**

```bash
git add apps/flowershow/lib/db/internal.ts
git commit -m "feat: add subdomain to internalSiteSelect"
```

---

### Task 5: Update GET /api/sites (list)

**Files:**
- Modify: `apps/flowershow/app/api/sites/route.ts`

**Step 1: Add subdomain to Prisma select (line ~224)**

In the `prisma.site.findMany` call, add to the `select` block:

```typescript
subdomain: true,
```

**Step 2: Update URL construction in the map (line ~241)**

Change:

```typescript
const formattedSites = sites.map((site) => ({
  id: site.id,
  projectName: site.projectName,
  url: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`,
  fileCount: site._count.blobs,
  updatedAt: site.updatedAt.toISOString(),
  createdAt: site.createdAt.toISOString(),
}));
```

To:

```typescript
const formattedSites = sites.map((site) => ({
  id: site.id,
  projectName: site.projectName,
  subdomain: site.subdomain,
  url: site.subdomain
    ? `https://${site.subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN}`
    : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`,
  fileCount: site._count.blobs,
  updatedAt: site.updatedAt.toISOString(),
  createdAt: site.createdAt.toISOString(),
}));
```

**Step 3: Run tests**

```bash
cd apps/flowershow && pnpm test
```

Expected: all passing

**Step 4: Commit**

```bash
git add apps/flowershow/app/api/sites/route.ts
git commit -m "feat: update GET /api/sites to return subdomain URL"
```

---

### Task 6: Update POST /api/sites (create) and GET /api/sites (list) — assign subdomain on creation

**Files:**
- Modify: `apps/flowershow/app/api/sites/route.ts`

**Step 1: Assign subdomain when creating a new site (line ~119)**

Change:

```typescript
// Create new site
site = await prisma.site.create({
  data: {
    projectName: sanitizedName,
    autoSync: false,
    userId: auth.userId,
  },
});
```

To:

```typescript
// Create new site
site = await prisma.site.create({
  data: {
    projectName: sanitizedName,
    subdomain: `${sanitizedName}-${username}`,
    autoSync: false,
    userId: auth.userId,
  },
});
```

**Step 2: Update siteUrl generation (line ~131)**

Change:

```typescript
const siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${sanitizedName}`;
```

To:

```typescript
const subdomain = site.subdomain ?? `${sanitizedName}-${username}`;
const siteUrl = `https://${subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN}`;
```

**Step 3: Run tests**

```bash
cd apps/flowershow && pnpm test
```

Expected: all passing

**Step 4: Commit**

```bash
git add apps/flowershow/app/api/sites/route.ts
git commit -m "feat: assign subdomain on site creation, use subdomain URL in response"
```

---

### Task 7: Update GET /api/sites/id/[siteId]

**Files:**
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/route.ts`

**Step 1: Add subdomain to Prisma select (line ~43)**

After `customDomain: true,`, add:

```typescript
subdomain: true,
```

**Step 2: Update URL construction (line ~96)**

Change:

```typescript
let siteUrl: string;
if (site.customDomain) {
  siteUrl = `https://${site.customDomain}`;
} else {
  siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
}
```

To:

```typescript
let siteUrl: string;
if (site.customDomain) {
  siteUrl = `https://${site.customDomain}`;
} else if (site.subdomain) {
  siteUrl = `https://${site.subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN}`;
} else {
  siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
}
```

**Step 3: Add subdomain to response object (line ~103)**

In the `GetSiteResponse` object, after `customDomain: site.customDomain,`, add:

```typescript
subdomain: site.subdomain,
```

**Step 4: Run tests**

```bash
cd apps/flowershow && pnpm test
```

Expected: all passing

**Step 5: Commit**

```bash
git add apps/flowershow/app/api/sites/id/[siteId]/route.ts
git commit -m "feat: update GET /api/sites/id/[siteId] to return subdomain URL"
```

---

### Task 8: Add _subdomain case to GET /api/sites/[username]/[projectname]

**Files:**
- Modify: `apps/flowershow/app/api/sites/[username]/[projectname]/route.tsx`

**Step 1: Add _subdomain lookup case (line ~24)**

In the `if (username === '_domain')` block, add a new case right after it:

```typescript
if (username === '_domain') {
  site = await prisma.site.findUnique({
    where: {
      customDomain: projectname,
    },
    select: internalSiteSelect,
  });
} else if (username === '_subdomain') {
  site = await prisma.site.findUnique({
    where: {
      subdomain: projectname,
    },
    select: internalSiteSelect,
  });
} else if (username === 'anon') {
```

**Step 2: Add subdomain to the extended site select (line ~59)**

In the authenticated extended query, after `customDomain: true,`, add:

```typescript
subdomain: true,
```

**Step 3: Update URL construction in the extended response (line ~93)**

Change:

```typescript
let siteUrl: string;
if (extendedSite.customDomain) {
  siteUrl = `https://${extendedSite.customDomain}`;
} else {
  siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${extendedSite.user.username}/${extendedSite.projectName}`;
}
```

To:

```typescript
let siteUrl: string;
if (extendedSite.customDomain) {
  siteUrl = `https://${extendedSite.customDomain}`;
} else if (extendedSite.subdomain) {
  siteUrl = `https://${extendedSite.subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN}`;
} else {
  siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${extendedSite.user.username}/${extendedSite.projectName}`;
}
```

**Step 4: Add subdomain to the extended response object (line ~100)**

After `customDomain: extendedSite.customDomain,`, add:

```typescript
subdomain: extendedSite.subdomain,
```

**Step 5: Run tests**

```bash
cd apps/flowershow && pnpm test
```

Expected: all passing

**Step 6: Commit**

```bash
git add apps/flowershow/app/api/sites/[username]/[projectname]/route.tsx
git commit -m "feat: add _subdomain lookup to site API, include subdomain in extended response"
```

---

### Task 9: Update middleware routing

**Files:**
- Modify: `apps/flowershow/middleware.ts`

**Step 1: Add import for NEXT_PUBLIC_SITE_DOMAIN**

`env.mjs` already exports `env` — `NEXT_PUBLIC_SITE_DOMAIN` will be available automatically once added to the schema (Task 1).

**Step 2: Replace the legacy flowershow.app redirect (line ~77)**

Change:

```typescript
// 3) Legacy redirect: flowershow.app/@... → my.flowershow.app/@...
if (hostname === 'flowershow.app' && pathname.startsWith('/@')) {
  return withPHBootstrapCookie(
    NextResponse.redirect(
      new URL(`https://my.flowershow.app${path}`, req.url),
      { status: 301 },
    ),
    phBootstrap,
  );
}
```

To:

```typescript
// 3) Legacy redirect: flowershow.app/@... → new subdomain URL
if (hostname === 'flowershow.app' && pathname.startsWith('/@')) {
  const aliasResolved = resolveSiteAlias(pathname, 'from');
  const legacyMatch = aliasResolved.match(/^\/@([^/]+)\/([^/]+)(.*)/);
  if (legacyMatch) {
    const [, legacyUser, legacyProject] = legacyMatch;
    const legacySite = await fetchSite(
      req,
      `/api/sites/${legacyUser}/${legacyProject}`,
    );
    if (legacySite?.subdomain) {
      return withPHBootstrapCookie(
        NextResponse.redirect(
          new URL(
            `https://${legacySite.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}${pathname.slice(legacyMatch[1].length + legacyMatch[2].length + 2)}${searchParams}`,
            req.url,
          ),
          { status: 301 },
        ),
        phBootstrap,
      );
    }
  }
  // fallback: redirect to my.flowershow.app
  return withPHBootstrapCookie(
    NextResponse.redirect(
      new URL(`https://${env.NEXT_PUBLIC_ROOT_DOMAIN}${path}`, req.url),
      { status: 301 },
    ),
    phBootstrap,
  );
}
```

**Step 3: Add *.flowershow.site case BEFORE the custom domain catch-all (before line ~203)**

After the `// 6) Flowershow home domain` block (around line 201), add a new section:

```typescript
// 7) Subdomain sites: {projectName}-{username}.flowershow.site
if (hostname.endsWith(`.${env.NEXT_PUBLIC_SITE_DOMAIN}`)) {
  const subdomain = hostname.slice(
    0,
    -(env.NEXT_PUBLIC_SITE_DOMAIN.length + 1),
  );

  const site = await fetchSite(req, `/api/sites/_subdomain/${subdomain}`);
  if (!site) return rewrite(`/not-found`, req, phBootstrap);

  const { username } = site.user;
  const projectname = site.projectName;

  if (pathname === '/robots.txt') {
    return rewrite(`/api/robots/${hostname}`, req, phBootstrap);
  }

  if (pathname === '/_login') {
    return rewrite(
      `/site-access/${username}/${projectname}`,
      req,
      phBootstrap,
    );
  }

  const guard = await ensureSiteAccess(req, site, phBootstrap);
  if (guard) return guard;

  if (pathname === '/sitemap.xml') {
    return rewrite(
      `/api/sitemap/${username}/${projectname}`,
      req,
      phBootstrap,
    );
  }

  if (pathname === '/rss.xml') {
    return rewrite(`/api/rss/${username}/${projectname}`, req, phBootstrap);
  }

  const raw = rewriteRawIfNeeded(
    path,
    `/api/raw/${username}/${projectname}`,
    req,
    phBootstrap,
  );
  if (raw) return raw;

  return rewrite(
    `/site/${username}/${projectname}${pathname}${searchParams}`,
    req,
    phBootstrap,
  );
}
```

Update the comment on the old custom domain section to `// 8) Custom domains`.

**Step 4: Replace my.flowershow.app case with redirect (line ~129)**

The current `// 5) Root domain` block rewrites to serve sites. Replace it with a redirect to the new subdomain URL:

```typescript
// 5) Root domain (my.flowershow.app) — redirect to new subdomain URL
if (hostname === env.NEXT_PUBLIC_ROOT_DOMAIN) {
  if (pathname === '/sitemap.xml')
    return rewrite(`/sitemap.xml`, req, phBootstrap);
  if (pathname === '/robots.txt')
    return rewrite(`/robots.txt`, req, phBootstrap);

  const aliasResolved = resolveSiteAlias(pathname, 'from');
  const match = aliasResolved.match(/^\/@([^/]+)\/([^/]+)(.*)/);

  if (!match) return rewrite(`/not-found`, req, phBootstrap);

  const [, username, projectname, slug = ''] = match;

  const site = await fetchSite(req, `/api/sites/${username}/${projectname}`);
  if (!site) return rewrite(`/not-found`, req, phBootstrap);

  const subdomain =
    site.subdomain ?? `${projectname}-${username}`;

  return withPHBootstrapCookie(
    NextResponse.redirect(
      new URL(
        `https://${subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}${slug}${searchParams}`,
        req.url,
      ),
      { status: 301 },
    ),
    phBootstrap,
  );
}
```

**Step 5: Run tests**

```bash
cd apps/flowershow && pnpm test
```

Expected: all passing

**Step 6: Commit**

```bash
git add apps/flowershow/middleware.ts
git commit -m "feat: add subdomain routing, redirect my.flowershow.app and flowershow.app to new URLs"
```

---

### Task 10: Remove getSiteUrlPath call sites — site rendering

**Files:**
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/layout.tsx`
- Modify: `apps/flowershow/app/(public)/site-access/[user]/[project]/page.tsx`

All three files import `getSiteUrlPath` from `@/lib/get-site-url`. Since it's deleted, each reference must be removed.

**Step 1: Update page.tsx**

- Remove `getSiteUrlPath` from the import on line 19 (keep `getSiteUrl`)
- Remove `const sitePrefix = getSiteUrlPath(site);` on line 158
- Add `const sitePrefix = '';` in its place

**Step 2: Update layout.tsx**

- Remove the `getSiteUrlPath` import on line 16
- Remove `const sitePrefix = getSiteUrlPath(site);` on line 107
- Add `const sitePrefix = '';` in its place

**Step 3: Update site-access/[user]/[project]/page.tsx**

- Remove `getSiteUrlPath` from the import (keep `getSiteUrl`)

**Step 4: Run tests**

```bash
cd apps/flowershow && pnpm test
```

Expected: all passing

**Step 5: Commit**

```bash
git add "apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx"
git add "apps/flowershow/app/(public)/site/[user]/[project]/layout.tsx"
git add "apps/flowershow/app/(public)/site-access/[user]/[project]/page.tsx"
git commit -m "feat: replace getSiteUrlPath with empty string in site rendering"
```

---

### Task 11: Remove getSiteUrlPath call sites — dashboard and tRPC router

**Files:**
- Modify: `apps/flowershow/server/api/routers/site.ts`
- Modify: `apps/flowershow/components/dashboard/site-card.tsx`
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/header.tsx`
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/welcome/page.tsx`
- Modify: `apps/flowershow/app/(cloud)/dragndrop/page.tsx`

**Step 1: Update server/api/routers/site.ts**

This file has:
- Line 23: `import { getSiteUrlPath } from '@/lib/get-site-url';`
- Line 207: `const siteUrl = \`https://${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${creator.username}/${projectName}\`;`
- Lines 887, 1045, 1147, 1289, 1521, 1625: `const sitePrefix = getSiteUrlPath(site);`

Changes:
- Remove the `getSiteUrlPath` import on line 23
- On line 207, change the hardcoded URL to use subdomain:
  ```typescript
  const newSubdomain = `${projectName}-${creator.username}`;
  const siteUrl = `https://${newSubdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;
  ```
- Replace all 6 occurrences of `const sitePrefix = getSiteUrlPath(site);` with `const sitePrefix = '';`

**Step 2: Update site-card.tsx**

This file constructs the URL manually. Find the URL construction (around line 19):

```typescript
if (...production...) {
  url = `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
} else {
  url = `http://${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
}
```

Replace with (the site card receives the site object — check what fields are available; if `subdomain` is available, use it; otherwise fall back):

```typescript
const protocol = env.NEXT_PUBLIC_VERCEL_ENV === 'production' || env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ? 'https' : 'http';
if (site.customDomain) {
  url = `${protocol}://${site.customDomain}`;
} else if (site.subdomain) {
  url = `${protocol}://${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;
} else {
  url = `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
}
```

Note: read the existing code carefully first to understand what props the component receives before making this change.

**Step 3: Update settings/header.tsx**

Line 41 constructs the URL. Change to use `getSiteUrl` from `@/lib/get-site-url` (passing the site object with subdomain included), or inline the same subdomain-first logic.

**Step 4: Update welcome/page.tsx**

Line 25 constructs the URL. Same pattern — use subdomain if available.

**Step 5: Update dragndrop/page.tsx**

- Remove `getSiteUrlPath` import on line 13
- Line 305: `const siteUrl = getSiteUrlPath(site);` — change to `const siteUrl = getSiteUrl(site);` (import `getSiteUrl` instead)
- Lines 335, 345: replace `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${siteUrl}` with just `siteUrl` (since `getSiteUrl` now returns the full URL)

**Step 6: Run tests**

```bash
cd apps/flowershow && pnpm test
```

Expected: all passing

**Step 7: Commit**

```bash
git add apps/flowershow/server/api/routers/site.ts \
  apps/flowershow/components/dashboard/site-card.tsx \
  "apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/header.tsx" \
  "apps/flowershow/app/(cloud)/dashboard/site/[id]/welcome/page.tsx" \
  "apps/flowershow/app/(cloud)/dragndrop/page.tsx"
git commit -m "feat: remove all getSiteUrlPath usages, use subdomain URLs in dashboard"
```

---

### Task 12: CLI cleanup

**Files:**
- Modify: `apps/cli/lib/const.ts`
- Modify: `apps/cli/lib/utils.ts`
- Modify: `apps/cli/lib/commands/publish.ts`
- Modify: `apps/cli/lib/commands/list.ts`
- Modify: `apps/cli/lib/commands/delete.ts`

**Step 1: Remove APP_URL from const.ts**

Remove the line:

```typescript
export const APP_URL = process.env.APP_URL || 'https://my.flowershow.app';
```

**Step 2: Update utils.ts**

- Remove `APP_URL` from the import on line 4 (keep `API_URL`)
- Remove the `getSiteUrl(projectName, username)` function (lines 50–52)
- Change `displayPublishSuccess` signature from `(projectName: string, username: string)` to `(url: string)`:

```typescript
export function displayPublishSuccess(url: string): void {
  console.log(chalk.cyan(`\n💐 Visit your site at: ${url}\n`));
}
```

**Step 3: Update commands/publish.ts**

The `site` object from `createSite()` already has `site.url`. Change (line ~188):

```typescript
displayPublishSuccess(
  site.projectName,
  user.username || user.email || 'user',
);
```

To:

```typescript
displayPublishSuccess(site.url);
```

Also remove `displayPublishSuccess` import of the old signature (it'll be the same function, just different signature — this will auto-update with the utils.ts change).

**Step 4: Update commands/list.ts**

Remove `getSiteUrl` from import. Change (line ~34):

```typescript
const url = getSiteUrl(
  site.projectName,
  user.username || user.email || 'user',
);
```

To:

```typescript
const url = site.url;
```

**Step 5: Update commands/delete.ts**

Remove `getSiteUrl` from import. Change (line ~40):

```typescript
const url = getSiteUrl(projectName, user.username || user.email || 'user');
```

Read the delete command to understand what object `siteToDelete` is — if it comes from a `GET /api/sites/id/{siteId}` or list call, it should have `.url`. If it only has `projectName`, switch to constructing the subdomain URL from the API response's `url` field directly.

**Step 6: Run CLI build**

```bash
cd apps/cli && pnpm build 2>&1 | tail -10
```

Expected: builds successfully

**Step 7: Commit**

```bash
git add apps/cli/lib/const.ts apps/cli/lib/utils.ts \
  apps/cli/lib/commands/publish.ts apps/cli/lib/commands/list.ts \
  apps/cli/lib/commands/delete.ts
git commit -m "feat(cli): remove APP_URL and getSiteUrl, use site.url from API response"
```

---

### Task 13: Data migration script (backfill existing sites)

**Files:**
- Create: `apps/flowershow/scripts/backfill-subdomains.ts`

**Step 1: Create migration script**

```typescript
import prisma from '../server/db';

async function main() {
  const sites = await prisma.site.findMany({
    where: { subdomain: null },
    select: {
      id: true,
      projectName: true,
      user: { select: { username: true } },
    },
  });

  console.log(`Found ${sites.length} sites without subdomains.`);

  let updated = 0;
  let skipped = 0;

  for (const site of sites) {
    const subdomain = `${site.projectName}-${site.user.username}`;
    try {
      await prisma.site.update({
        where: { id: site.id },
        data: { subdomain },
      });
      updated++;
    } catch (err) {
      console.error(
        `Skipping site ${site.id} (${subdomain}): ${(err as Error).message}`,
      );
      skipped++;
    }
  }

  console.log(`Done. Updated: ${updated}, Skipped (conflicts): ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: Add to package.json scripts in apps/flowershow**

In `apps/flowershow/package.json`, add to `scripts`:

```json
"db:backfill-subdomains": "tsx scripts/backfill-subdomains.ts"
```

**Step 3: Verify the script compiles**

```bash
cd apps/flowershow && npx tsx --no-run scripts/backfill-subdomains.ts 2>&1 | head -5
```

(Don't actually run it against the database locally — just check it parses)

**Step 4: Commit**

```bash
git add apps/flowershow/scripts/backfill-subdomains.ts apps/flowershow/package.json
git commit -m "feat: add subdomain backfill migration script for existing sites"
```

---

### Task 14: Final test run

**Step 1: Run full test suite from worktree root**

```bash
pnpm test
```

Expected: all 334+ tests passing

**Step 2: Check for any remaining references to old URL pattern**

```bash
grep -rn "my\.flowershow\.app/@\|NEXT_PUBLIC_ROOT_DOMAIN.*@" \
  apps/flowershow/app apps/flowershow/lib apps/flowershow/server apps/cli/lib \
  --include="*.ts" --include="*.tsx"
```

Expected: zero results (only the fallback in `get-site-url.ts` is acceptable)

**Step 3: Check getSiteUrlPath is fully gone**

```bash
grep -rn "getSiteUrlPath" apps/flowershow apps/cli --include="*.ts" --include="*.tsx"
```

Expected: zero results

**Step 4: Commit any final fixes, then push**

```bash
git push -u origin feature/subdomain-url-migration
```
