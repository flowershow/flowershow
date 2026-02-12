# Typesense Collection Creation for API Endpoints

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure Typesense collections are created for sites published via CLI, Obsidian plugin, and anonymous publish endpoints so the Cloudflare worker can index their content.

**Architecture:** Add `createSiteCollection(siteId)` calls to the 4 API endpoints that bypass the Inngest sync pipeline. The function is already idempotent (ignores HTTP 409 if collection exists), so it's safe to call on every request. Place the call after site creation/validation but before returning presigned URLs.

**Tech Stack:** Next.js API routes, Typesense client (`lib/typesense.ts`)

---

### Task 1: Add `ensureSiteCollection` helper to `lib/typesense.ts`

The existing `createSiteCollection` already handles 409 (collection exists), but the Inngest code does a two-step check-then-create pattern. We should add a clearly-named idempotent helper that expresses intent and can be called freely without the caller needing to check existence first.

**Files:**
- Modify: `lib/typesense.ts:61` (after `createSiteCollection`)

**Step 1: Add `ensureSiteCollection` function**

Add after line 61 in `lib/typesense.ts`:

```typescript
/**
 * Ensure a Typesense collection exists for a site.
 * Idempotent — safe to call multiple times; silently succeeds if collection already exists.
 */
export async function ensureSiteCollection(siteId: string) {
  await createSiteCollection(siteId);
}
```

This is a thin wrapper that makes call-site intent clear. `createSiteCollection` already swallows 409.

**Step 2: Commit**

```bash
git add lib/typesense.ts
git commit -m "feat: add ensureSiteCollection idempotent helper"
```

---

### Task 2: Add Typesense collection creation to `POST /api/sites`

**Files:**
- Modify: `app/api/sites/route.ts`

**Step 1: Add import and call**

Add import at top of `app/api/sites/route.ts`:

```typescript
import { ensureSiteCollection } from '@/lib/typesense';
```

Add the call after the site is created/updated (after line 115, before the response is built). The call should be inside the try block:

```typescript
// Ensure Typesense collection exists for search indexing
await ensureSiteCollection(site.id);
```

**Step 2: Commit**

```bash
git add app/api/sites/route.ts
git commit -m "fix: create Typesense collection when site created via CLI"
```

---

### Task 3: Add Typesense collection creation to `POST /api/sites/id/:siteId/files`

**Files:**
- Modify: `app/api/sites/id/[siteId]/files/route.ts`

**Step 1: Add import and call**

Add import at top:

```typescript
import { ensureSiteCollection } from '@/lib/typesense';
```

Add the call after site ownership is validated (after line 97, before file processing begins):

```typescript
// Ensure Typesense collection exists for search indexing
await ensureSiteCollection(siteId);
```

**Step 2: Commit**

```bash
git add app/api/sites/id/\[siteId\]/files/route.ts
git commit -m "fix: create Typesense collection when files published via CLI"
```

---

### Task 4: Add Typesense collection creation to `POST /api/sites/id/:siteId/sync`

**Files:**
- Modify: `app/api/sites/id/[siteId]/sync/route.ts`

**Step 1: Add import and call**

Add import at top:

```typescript
import { ensureSiteCollection } from '@/lib/typesense';
```

Add the call after site ownership is validated (after line 111, before dry-run check):

```typescript
// Ensure Typesense collection exists for search indexing
await ensureSiteCollection(siteId);
```

**Step 2: Commit**

```bash
git add app/api/sites/id/\[siteId\]/sync/route.ts
git commit -m "fix: create Typesense collection when site synced via CLI"
```

---

### Task 5: Add Typesense collection creation to `POST /api/sites/publish-anon`

**Files:**
- Modify: `app/api/sites/publish-anon/route.ts`

**Step 1: Add import and call**

Add import at top:

```typescript
import { ensureSiteCollection } from '@/lib/typesense';
```

Add the call after the site is created (after line 201, before blob creation loop):

```typescript
// Ensure Typesense collection exists for search indexing
await ensureSiteCollection(site.id);
```

**Step 2: Commit**

```bash
git add app/api/sites/publish-anon/route.ts
git commit -m "fix: create Typesense collection for anonymous publish"
```

---

### Task 6: Build verification

**Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

**Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

**Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Final commit (if any lint/format fixes needed)**

```bash
git add -A
git commit -m "chore: lint/format fixes"
```
