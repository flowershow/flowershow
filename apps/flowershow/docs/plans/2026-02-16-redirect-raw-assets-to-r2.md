# Redirect Raw Assets to R2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the `/api/raw` proxy (which streams every image/asset through Vercel serverless functions) with a 302 redirect to R2, eliminating server-side bandwidth and compute costs.

**Architecture:** The `/api/raw` route currently fetches the full file body from R2 and streams it back through the Vercel function. We change it to return a `302 redirect` to the R2 public URL for public sites, and a `302 redirect` to a time-limited presigned R2 URL for password-protected sites. This removes the proxy entirely — the browser fetches directly from R2/Cloudflare CDN.

**Tech Stack:** Next.js API routes, AWS S3 SDK (`@aws-sdk/s3-request-presigner` for `GetObjectCommand` signed URLs), Cloudflare R2.

---

## Background

### Current flow (bad)
```
Browser → middleware (rewrite) → /api/raw → DB lookup → fetch(R2) → stream body back
```
- Every request: 1 DB query + 1 full R2 fetch + streaming through serverless function
- For next/image: double fetch (Next.js optimization fetches through /api/raw, then re-encodes)
- ~300ms+ latency per image, Vercel function invocation cost, egress bandwidth cost

### New flow (good)
```
Browser → middleware (rewrite) → /api/raw → DB lookup → 302 redirect to R2 URL
Browser → R2/Cloudflare CDN (direct)
```
- DB lookup is fast (~5ms), response is a tiny 302 (no body)
- Browser follows redirect and fetches directly from R2
- Cloudflare CDN caches at edge if custom domain is configured on bucket

### Password-protected sites
```
Browser → middleware (cookie check ✓) → /api/raw → DB lookup → 302 redirect to signed R2 URL (5min TTL)
```
- Presigned GET URL expires quickly, so even if leaked, exposure is limited
- This also fixes the existing security hole where non-HTML asset requests bypass password checks entirely (middleware.ts lines 322-335)

---

## Task 1: Add presigned GET URL helper to content-store

**Files:**
- Modify: `lib/content-store.ts` (add `generatePresignedGetUrl`)
- Test: `lib/__tests__/content-store-presigned.test.ts`

**Step 1: Add the helper function**

In `lib/content-store.ts`, add after the existing `generatePresignedUploadUrl` function (~line 280):

```typescript
/**
 * Generate a presigned URL for reading (GET) a file from R2.
 * Used for password-protected sites so we can redirect to a
 * time-limited URL without proxying the body.
 *
 * @param key - The S3 key for the file
 * @param expiresIn - Expiration time in seconds (default: 300 = 5 minutes)
 * @returns Presigned URL for GET request
 */
export const generatePresignedGetUrl = async (
  key: string,
  expiresIn: number = 300,
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};
```

**Step 2: Commit**

```bash
git add lib/content-store.ts
git commit -m "feat: add presigned GET URL helper for R2 redirects"
```

---

## Task 2: Change /api/raw to redirect instead of proxy

**Files:**
- Modify: `app/api/raw/[username]/[projectName]/[[...path]]/route.tsx`

**Step 1: Rewrite the route handler**

Replace the entire `GET` handler in `route.tsx` with a redirect-based approach:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { generatePresignedGetUrl } from '@/lib/content-store';
import { PublicSite } from '@/server/api/types';
import prisma from '@/server/db';

export async function GET(
  req: NextRequest,
  props: {
    params: Promise<{
      username: string;
      projectName: string;
      path?: string[];
    }>;
  },
) {
  const params = await props.params;
  const { username, projectName, path } = params;

  if (!path || path.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  let site: PublicSite | null = null;

  if (username === '_domain') {
    site = await prisma.site.findFirst({
      where: {
        customDomain: projectName,
      },
      include: { user: true },
    });
  } else {
    site = await prisma.site.findFirst({
      where: {
        projectName,
        user: {
          username,
        },
      },
      include: { user: true },
    });
  }

  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const encodedPath = path
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const r2Key = `${site.id}/main/raw/${encodedPath}`;

  // For password-protected sites, use a short-lived presigned URL
  // so the asset is only accessible briefly even if the URL is shared.
  if (site.privacyMode === 'PASSWORD') {
    const signedUrl = await generatePresignedGetUrl(r2Key, 300); // 5 minutes
    return NextResponse.redirect(signedUrl, 302);
  }

  // For public sites, redirect directly to the R2 public domain.
  // If Cloudflare CDN is in front of this domain, images are cached at edge.
  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';
  const publicUrl = `${protocol}://${env.NEXT_PUBLIC_S3_BUCKET_DOMAIN}/${r2Key}`;

  return NextResponse.redirect(publicUrl, 302);
}
```

Key changes:
- No more `fetch()` to R2 — just a redirect
- Password-protected sites get presigned URLs (5-min TTL)
- Public sites get a direct redirect to the R2 public domain
- All the content-type detection, header manipulation, and body streaming code is removed

**Step 2: Commit**

```bash
git add app/api/raw/
git commit -m "feat: replace /api/raw proxy with 302 redirect to R2"
```

---

## Task 3: Fix the password-protected site security hole in middleware

**Files:**
- Modify: `middleware.ts`

**Step 1: Remove the non-HTML bypass hack**

In `middleware.ts`, the `ensureSiteAccess` function has a workaround that skips auth for non-HTML requests (lines 322-335). This was needed because Next.js `/_next/image` internal fetches don't carry cookies. With the redirect approach, this is no longer needed for `/api/raw` requests — but `/_next/image` requests will still fail because Next.js image optimization can't follow redirects to external URLs.

The fix: stop using `/_next/image` for site content images and let them load directly from R2. This is handled in Task 4.

For now, keep the non-HTML bypass but add a comment that it will be removed in Task 4 when next/image is configured with a custom loader.

**Actually, wait** — the redirect approach means `/_next/image` will try to fetch `/api/raw/...`, get a 302 redirect, and Next.js image optimization should follow redirects. Let's test this before removing the bypass. Leave this task as a verification step.

**Step 2: Verify behavior**

After deploying Tasks 1-2, test:
1. Public site: image loads via redirect ✓
2. Password-protected site: image loads via presigned redirect ✓
3. Password-protected site, no cookie: image request hits middleware → redirected to login ✓
4. `/_next/image` optimization: follows redirect and optimizes ✓ (if this fails, we need Task 4)

**Step 3: If /_next/image works with redirects, remove the hack**

Remove lines 322-335 in `middleware.ts` (the `isHtmlRequest` bypass in `ensureSiteAccess`):

```typescript
// DELETE THESE LINES:
const accept = req.headers.get('accept') || '';
const isHtmlRequest = accept.includes('text/html');
if (!isHtmlRequest) return null;
```

**Step 4: Commit**

```bash
git add middleware.ts
git commit -m "fix: remove non-HTML auth bypass now that /api/raw uses redirects"
```

---

## Task 4 (if needed): Custom next/image loader for R2

**Only needed if** `/_next/image` can't follow 302 redirects (likely — Next.js image optimization fetches the source URL server-side and may not follow redirects).

**Files:**
- Create: `lib/r2-image-loader.ts`
- Modify: `next.config.mjs` (add `images.loader` or `images.loaderFile`)
- Modify: `components/public/mdx/fs-image.tsx` (pass `loader` prop)

**Step 1: Create custom loader**

```typescript
// lib/r2-image-loader.ts
import { env } from '@/env.mjs';

export default function r2ImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // If the src is already an absolute URL, use it as-is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // For relative paths (site content images), construct the R2 URL directly.
  // This bypasses /_next/image optimization but serves directly from R2/CDN.
  // Next.js image optimization is only valuable if we're resizing/converting,
  // which costs Vercel compute. Direct R2 serving is cheaper and faster.
  const isSecure =
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';
  return `${protocol}://${process.env.NEXT_PUBLIC_S3_BUCKET_DOMAIN}${src}`;
}
```

**Note:** This is a fallback approach. If `/_next/image` handles redirects correctly, this task is unnecessary. The trade-off is losing Next.js image optimization (WebP/AVIF conversion, resizing) but gaining direct CDN serving. For a future enhancement, Cloudflare Image Resizing could replace Next.js optimization entirely.

**Step 2: Configure in next.config.mjs**

```javascript
images: {
  remotePatterns: [{ hostname: '*' }],
  loaderFile: './lib/r2-image-loader.ts',
},
```

**Step 3: Commit**

```bash
git add lib/r2-image-loader.ts next.config.mjs
git commit -m "feat: add R2 image loader to bypass /_next/image proxy"
```

---

## Task 5: Infrastructure — Cloudflare CDN on R2 bucket (manual)

**This is not a code task.** It's a Cloudflare dashboard configuration.

1. In Cloudflare dashboard → R2 → your bucket → Settings → Public access
2. Add a custom domain (e.g., `assets.flowershow.app` or use existing `r2.flowershow.app`)
3. Ensure the Cloudflare proxy is enabled (orange cloud)
4. Set Cache Rules for the domain:
   - Match: `*.jpg`, `*.png`, `*.gif`, `*.webp`, `*.svg`, `*.ico`, `*.woff2`, `*.css`, `*.js`
   - Edge TTL: 1 day (or longer)
   - Browser TTL: 5 minutes (matches current `max-age=300`)
5. Update `NEXT_PUBLIC_S3_BUCKET_DOMAIN` env var if the domain changes

---

## Verification Checklist

After all tasks:
- [ ] Public site images load via redirect (check Network tab: 302 → 200 from R2)
- [ ] Password-protected site images load via signed redirect
- [ ] No serverless function execution time spent on image body streaming
- [ ] `/_next/image` works (or is bypassed with custom loader)
- [ ] Non-image raw files (PDF, CSV, etc.) also redirect correctly
- [ ] Video/audio files support Range requests (R2 handles this natively when served directly)
- [ ] Lighthouse image scores are same or better
