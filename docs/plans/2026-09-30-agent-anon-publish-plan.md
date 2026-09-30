# Agent Anonymous Publish + Claim Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agent (or person) can publish a folder or file to Flowershow with no account and no login, get a live URL plus a **claim link** it can hand to the human in chat, update the same URL later, and the human can claim the site into their account with one click. Also: headless/cloud agents can authenticate with a `FLOWERSHOW_TOKEN` env var.

**Architecture:** Reuse the existing authenticated publish path instead of the drag-and-drop one. A new endpoint `POST /api/sites/anon` creates an empty temporary site owned by the anonymous user and returns a **site-scoped claim token** (`fs_claim_…`, a JWT bound to one site). The existing sync (`/api/sites/id/:siteId/sync`) and status (`/api/sites/id/:siteId/status`) routes accept that claim token as auth for that one anonymous site, so the CLI's existing upload code works unchanged. The claim page accepts the token from the URL (`/claim?siteId=…&token=…`), so the link works from any browser. Anonymous creation gets a durable, DB-backed per-IP rate limit (the current in-memory limiter is per serverless instance and ineffective). Drag-and-drop (`/api/sites/publish-anon`, browser localStorage token) is left untouched.

**Tech Stack:** Next.js route handlers + Prisma (Postgres) + Zod contracts in `packages/api-contract`; vitest (`pnpm --filter flowershow test:unit`); Go CLI in `apps/cli` (cobra, `go test ./...`, fake API in `cmd/fakeapi_test.go`); `jsonwebtoken`.

**Spec:** Decision bead `flowershow-56f` (closed, decided 2026-09-30: anonymous agent publish + claim first, then MCP v1 on the same API) and bead `flowershow-z4f`. Evidence: `product/research/2026-10-here-now-teardown.md` §3 and §10 (here.now: 3 HTTP calls, 0 installs, 0 logins, portable claim URL) and `product/research/2026-10-ai-publishing-landscape.md` gap #2. Read `bd show flowershow-z4f` (notes list the existing building blocks and gaps).

## Background the implementer needs

- **Existing anonymous flow (don't break it):** `apps/flowershow/app/api/sites/publish-anon/route.ts` (drag-and-drop; max 5 files; requires a `.md`; returns presigned URLs + a *browser-wide* 30-day `ownershipToken` from `generateOwnershipToken(anonymousUserId)` in `apps/flowershow/lib/anonymous-user.ts`). Claim: `apps/flowershow/app/api/sites/claim/route.ts` (needs a logged-in session + `ownershipToken`; verifies `site.anonymousOwnerId`) and the page `apps/flowershow/app/(cloud)/dragndrop/claim/page.tsx`, served at `https://flowershow.app/claim` via `apps/flowershow/middleware.ts` (~line 175). The page reads the token from localStorage via `getAnonymousToken()`, which is why agent-made sites can't be claimed today.
- **Why a new site-scoped token:** the existing `ownershipToken` proves ownership of *every* anonymous site made by one browser ID. Putting it in a URL would let anyone holding one claim link claim all of them. The new `fs_claim_` token names exactly one `siteId`.
- **Anonymous sites:** `Site.userId = ANONYMOUS_USER_ID` (`anon000…`), `anonymousOwnerId` (uuid), `isTemporary = true`, `expiresAt` = now + 7 days. They're served at `https://<projectName>-anon.flowershow.me` (see `buildSubdomain(projectName, 'anon')` in `lib/site-subdomain.ts`). A cron in `apps/cloudflare-worker/src/worker.js` (`cleanupExpiredSites`) deletes expired ones. The public lookup `site.getAnonymous` (`apps/flowershow/server/api/routers/site.ts` ~line 139) does **not** check `expiresAt`, so expired sites are served until the cron runs; Task 6 fixes that.
- **Auth today:** `validateAccessToken(request)` in `apps/flowershow/lib/cli-auth.ts` accepts `Bearer fs_cli_…` and `Bearer fs_pat_…` (PATs are created at `cloud.flowershow.app/tokens`). The CLI sends `Authorization` from `auth.GetToken()` in `apps/cli/internal/api/client.go` `Request()`.
- **Contract-first:** read `packages/api-contract/README.md` and AGENTS.md "REST API and api-contract" before touching routes. New/changed shapes go in `packages/api-contract/src/schemas.ts` and `src/routes/anonymous.ts` first.
- **Test patterns:** route tests mock `@/server/db` with `vi.mock` (see `apps/flowershow/app/api/raw/[username]/[projectName]/[[...path]]/route.test.ts`). CLI tests use the fake API in `apps/cli/cmd/fakeapi_test.go` and a temporary `HOME`.

## Global Constraints

- Claim token format: `fs_claim_<JWT>`, JWT payload `{ type: 'site_claim', siteId, anonymousUserId }`, signed with `env.ANONYMOUS_JWT_SECRET`, `expiresIn` 7 days (same as site expiry).
- Anonymous site expiry: 7 days from creation. **Updates do not extend expiry.**
- Anonymous limits (agent path): max **200 files** and **50 MB total** per sync; per-file limit unchanged (`MAX_FILE_SIZE` in `lib/publish-limits.ts`); HTML-only content is allowed (no Markdown requirement).
- Anonymous creation rate limit: **10 sites per IP per rolling hour**, counted in Postgres via a hashed IP column (`sha256(ip + ANONYMOUS_JWT_SECRET)`), never storing raw IPs.
- Claim URL: `https://<NEXT_PUBLIC_HOME_DOMAIN>/claim?siteId=<id>&token=<fs_claim_…>` (URL-encode the token).
- The CLI never publishes anonymously unless `--anon` is passed. When not logged in and `--anon` is absent, it fails (exit 1) with a message that suggests both `fl login` and `fl --anon`.
- Anonymous sites are `noindex` (pages and raw files).
- Drag-and-drop behaviour and `/api/sites/publish-anon` stay unchanged.
- Changelog entry required (AGENTS.md format, `authors: - rufuspollock`); docs updated; no hard-wrapped Markdown prose.
- CLI version bump to `2.5.0` with `apps/cli/CHANGELOG.md` entry; skill (`flowershow/skills`) updated in a separate PR with a changeset.

## Review Focus

1. **A claim token for site A used against site B** (sync, status or claim) must get 403. Tested in Task 4 and Task 5.
2. **After a site is claimed**, its old claim token must stop working for sync/status (the site is no longer anonymous). Tested in Task 4.
3. **Expired anonymous site:** sync with its claim token → 410; public page → 404 even before the cleanup cron runs. Tested in Tasks 4 and 6.
4. **Login redirect keeps the token:** an unauthenticated visitor opening the claim link must come back to `/claim?siteId=…&token=…` after login and claim successfully. Tested in Task 5 (callback URL built with the token).
5. **`fl` never goes anonymous implicitly:** with no login and no `--anon`, `fl --yes ./x` exits 1 and creates nothing. Tested in Task 7.

---

## File Structure

- `apps/flowershow/lib/anonymous-user.ts`: add `generateSiteClaimToken`, `verifySiteClaimToken`, `buildClaimUrl`.
- `apps/flowershow/lib/anon-rate-limit.ts` (new): `hashIp`, `checkAnonCreateLimit`.
- `apps/flowershow/prisma/schema.prisma` + new migration: `Site.anonCreatorIpHash` + index.
- `apps/flowershow/lib/site-auth.ts` (new): `authorizeSiteRequest(request, siteId)`, shared by sync and status.
- `apps/flowershow/app/api/sites/anon/route.ts` (new): `POST` creates an anonymous site.
- `apps/flowershow/app/api/sites/id/[siteId]/sync/route.ts`, `…/status/route.ts`: use `authorizeSiteRequest`; anon limits.
- `apps/flowershow/lib/publish-limits.ts`: `validateAnonPublishFiles`.
- `apps/flowershow/app/api/sites/claim/route.ts` + `apps/flowershow/app/(cloud)/dragndrop/claim/page.tsx`: accept claim token.
- `apps/flowershow/server/api/routers/site.ts` (`getAnonymous`), public page metadata, raw route: expiry + noindex.
- `packages/api-contract/src/schemas.ts`, `src/routes/anonymous.ts`: new/changed schemas + OpenAPI.
- `apps/cli/internal/auth/auth.go`: `FLOWERSHOW_TOKEN`.
- `apps/cli/internal/api/client.go`: `CreateAnonSite`, per-request token override.
- `apps/cli/internal/localconfig/localconfig.go`: anon fields.
- `apps/cli/cmd/publish.go`, `apps/cli/cmd/root.go`: `--anon`.
- Docs: `content/flowershow-app/docs/reference/cli.md`, `docs/agents/skills.md` (mention), changelog `content/flowershow-app/changelog/2026-10-XX-publish-without-account.md`.

---

### Task 1: Site-scoped claim tokens

**Files:**
- Modify: `apps/flowershow/lib/anonymous-user.ts`
- Test: `apps/flowershow/lib/anonymous-user.test.ts` (create)

**Interfaces:**
- Produces:
  - `generateSiteClaimToken(siteId: string, anonymousUserId: string): string` returns `fs_claim_<jwt>`.
  - `verifySiteClaimToken(token: string): { siteId: string; anonymousUserId: string } | null`.
  - `buildClaimUrl(siteId: string, claimToken: string): string`.
  - `CLAIM_TOKEN_PREFIX = 'fs_claim_'`.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/flowershow/lib/anonymous-user.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    ANONYMOUS_JWT_SECRET: 'test-secret',
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
  },
}));

import {
  buildClaimUrl,
  CLAIM_TOKEN_PREFIX,
  generateOwnershipToken,
  generateSiteClaimToken,
  verifySiteClaimToken,
} from './anonymous-user';

const ANON = '3f1c2b7a-1d2e-4f3a-9b4c-5d6e7f8a9b0c';

describe('site claim tokens', () => {
  it('round-trips siteId and anonymousUserId', () => {
    const token = generateSiteClaimToken('site-1', ANON);
    expect(token.startsWith(CLAIM_TOKEN_PREFIX)).toBe(true);
    expect(verifySiteClaimToken(token)).toEqual({ siteId: 'site-1', anonymousUserId: ANON });
  });

  it('rejects a browser ownership token (different type)', () => {
    const ownership = generateOwnershipToken(ANON);
    expect(verifySiteClaimToken(`${CLAIM_TOKEN_PREFIX}${ownership}`)).toBeNull();
    expect(verifySiteClaimToken(ownership)).toBeNull();
  });

  it('rejects a tampered token', () => {
    const token = generateSiteClaimToken('site-1', ANON);
    expect(verifySiteClaimToken(token.slice(0, -2) + 'xx')).toBeNull();
  });

  it('builds an https claim URL with the token encoded', () => {
    const url = buildClaimUrl('site-1', 'fs_claim_a.b.c');
    expect(url).toBe('https://flowershow.app/claim?siteId=site-1&token=fs_claim_a.b.c');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter flowershow exec vitest run lib/anonymous-user.test.ts`
Expected: FAIL (`generateSiteClaimToken` is not exported).

- [ ] **Step 3: Implement**

Append to `apps/flowershow/lib/anonymous-user.ts`:

```ts
export const CLAIM_TOKEN_PREFIX = 'fs_claim_';

/**
 * Site-scoped claim token: proves the bearer may update (while anonymous) and
 * claim exactly one anonymous site. Safe to put in a URL, unlike the
 * browser-wide ownership token above. SERVER-SIDE ONLY.
 */
export function generateSiteClaimToken(siteId: string, anonymousUserId: string): string {
  const jwtToken = jwt.sign(
    { type: 'site_claim', siteId, anonymousUserId },
    ANONYMOUS_JWT_SECRET,
    { expiresIn: '7d' },
  );
  return `${CLAIM_TOKEN_PREFIX}${jwtToken}`;
}

export function verifySiteClaimToken(
  token: string,
): { siteId: string; anonymousUserId: string } | null {
  if (!token.startsWith(CLAIM_TOKEN_PREFIX)) return null;
  try {
    const decoded = jwt.verify(token.slice(CLAIM_TOKEN_PREFIX.length), ANONYMOUS_JWT_SECRET) as {
      type?: string;
      siteId?: string;
      anonymousUserId?: string;
    };
    if (decoded.type !== 'site_claim' || !decoded.siteId || !decoded.anonymousUserId) return null;
    return { siteId: decoded.siteId, anonymousUserId: decoded.anonymousUserId };
  } catch {
    return null;
  }
}

export function buildClaimUrl(siteId: string, claimToken: string): string {
  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' || env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';
  const params = new URLSearchParams({ siteId, token: claimToken });
  return `${protocol}://${env.NEXT_PUBLIC_HOME_DOMAIN}/claim?${params.toString()}`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter flowershow exec vitest run lib/anonymous-user.test.ts`
Expected: 4 passed. (If `URLSearchParams` encodes `.` differently, the test's expected string is still correct: `.` and `_` are not encoded.)

- [ ] **Step 5: Commit**

```bash
git add apps/flowershow/lib/anonymous-user.ts apps/flowershow/lib/anonymous-user.test.ts
git commit -m "feat(anon): site-scoped fs_claim_ tokens and claim URLs (flowershow-z4f)"
```

---

### Task 2: Durable per-IP rate limit for anonymous site creation

**Files:**
- Modify: `apps/flowershow/prisma/schema.prisma` (model `Site`)
- Create: migration via `prisma migrate dev --name add_site_anon_creator_ip_hash`
- Create: `apps/flowershow/lib/anon-rate-limit.ts`
- Test: `apps/flowershow/lib/anon-rate-limit.test.ts`

**Interfaces:**
- Produces:
  - `hashIp(ip: string): string` (hex sha256 of `ip + ANONYMOUS_JWT_SECRET`).
  - `checkAnonCreateLimit(ipHash: string, now?: Date): Promise<boolean>` returns true if allowed.
  - `ANON_CREATE_LIMIT_PER_HOUR = 10`.
  - DB column `Site.anonCreatorIpHash String? @map("anon_creator_ip_hash")` with `@@index([anonCreatorIpHash, createdAt])`.

- [ ] **Step 1: Add the schema field**

In `model Site`, next to `anonymousOwnerId`:

```prisma
  anonCreatorIpHash       String?       @map("anon_creator_ip_hash")
```

and in the model's index block:

```prisma
  @@index([anonCreatorIpHash, createdAt])
```

Run: `cd apps/flowershow && pnpm prisma migrate dev --name add_site_anon_creator_ip_hash` (needs the local dev DB from `docker-compose.yml`; if unavailable, write the migration SQL by hand in `prisma/migrations/<timestamp>_add_site_anon_creator_ip_hash/migration.sql`):

```sql
ALTER TABLE "Site" ADD COLUMN "anon_creator_ip_hash" TEXT;
CREATE INDEX "Site_anon_creator_ip_hash_created_at_idx" ON "Site"("anon_creator_ip_hash", "created_at");
```

Check the exact table/column naming against a recent migration in `prisma/migrations/` (e.g. the one adding `anonymous_owner_id`) and match it. Then run `pnpm prisma generate`.

- [ ] **Step 2: Write the failing test**

```ts
// apps/flowershow/lib/anon-rate-limit.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({ env: { ANONYMOUS_JWT_SECRET: 'test-secret' } }));
vi.mock('@/server/db', () => ({ default: { site: { count: vi.fn() } } }));

import prisma from '@/server/db';
import { ANON_CREATE_LIMIT_PER_HOUR, checkAnonCreateLimit, hashIp } from './anon-rate-limit';

const count = prisma.site.count as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('anon create rate limit', () => {
  it('hashes IPs deterministically without exposing them', () => {
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
    expect(hashIp('1.2.3.4')).not.toContain('1.2.3.4');
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
  });

  it('allows below the limit and counts only the last hour', async () => {
    count.mockResolvedValue(ANON_CREATE_LIMIT_PER_HOUR - 1);
    const now = new Date('2026-10-01T12:00:00Z');
    expect(await checkAnonCreateLimit('h', now)).toBe(true);
    expect(count).toHaveBeenCalledWith({
      where: { anonCreatorIpHash: 'h', createdAt: { gt: new Date('2026-10-01T11:00:00Z') } },
    });
  });

  it('blocks at the limit', async () => {
    count.mockResolvedValue(ANON_CREATE_LIMIT_PER_HOUR);
    expect(await checkAnonCreateLimit('h')).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter flowershow exec vitest run lib/anon-rate-limit.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement**

```ts
// apps/flowershow/lib/anon-rate-limit.ts
import { createHash } from 'node:crypto';
import { env } from '@/env.mjs';
import prisma from '@/server/db';

/** Max anonymous sites one IP may create per rolling hour. Durable across serverless instances. */
export const ANON_CREATE_LIMIT_PER_HOUR = 10;

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${ip}${env.ANONYMOUS_JWT_SECRET}`).digest('hex');
}

export async function checkAnonCreateLimit(ipHash: string, now: Date = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - 60 * 60 * 1000);
  const recent = await prisma.site.count({
    where: { anonCreatorIpHash: ipHash, createdAt: { gt: since } },
  });
  return recent < ANON_CREATE_LIMIT_PER_HOUR;
}
```

- [ ] **Step 5: Run to verify pass, then commit**

Run: `pnpm --filter flowershow exec vitest run lib/anon-rate-limit.test.ts`
Expected: 3 passed.

```bash
git add apps/flowershow/prisma apps/flowershow/lib/anon-rate-limit.ts apps/flowershow/lib/anon-rate-limit.test.ts
git commit -m "feat(anon): durable per-IP rate limit for anonymous site creation (flowershow-z4f)"
```

---

### Task 3: Contract + `POST /api/sites/anon`

**Files:**
- Modify: `packages/api-contract/src/schemas.ts`, `packages/api-contract/src/routes/anonymous.ts`
- Create: `apps/flowershow/app/api/sites/anon/route.ts`
- Test: `apps/flowershow/app/api/sites/anon/route.test.ts`

**Interfaces:**
- Consumes: Task 1 (`generateSiteClaimToken`, `buildClaimUrl`), Task 2 (`hashIp`, `checkAnonCreateLimit`).
- Produces:
  - `POST /api/sites/anon` with an empty JSON body `{}`, returning 200 `AnonCreateSiteResponse`, 429 when rate limited, or 500.
  - `AnonCreateSiteResponse = { siteId: string; projectName: string; liveUrl: string; claimToken: string; claimUrl: string; expiresAt: string /* ISO */ }`.

- [ ] **Step 1: Add contract schemas**

In `schemas.ts`, under the "Anonymous Publishing Schemas" block:

```ts
// POST /api/sites/anon — create an empty anonymous site for agent/CLI publishing
export const AnonCreateSiteResponseSchema = z.object({
  siteId: z.string(),
  projectName: z.string(),
  liveUrl: z.string(),
  claimToken: z.string(),
  claimUrl: z.string(),
  expiresAt: z.string(),
});
export type AnonCreateSiteResponse = z.infer<typeof AnonCreateSiteResponseSchema>;
```

In `routes/anonymous.ts`, register the route following the existing `publish-anon` registration in that file: method `post`, path `/api/sites/anon`, tag "Anonymous Publishing", description "Create an empty temporary site (expires in 7 days unless claimed) and a site-scoped claim token. Upload files with POST /api/sites/id/{siteId}/sync using `Authorization: Bearer <claimToken>`.", responses 200 (`AnonCreateSiteResponseSchema`) and 429. Export the schema from `src/index.ts` if schemas are re-exported explicitly there.

Run: `pnpm --filter @flowershow/api-contract build` (or the package's check script per its README).
Expected: success.

- [ ] **Step 2: Write the failing route test**

```ts
// apps/flowershow/app/api/sites/anon/route.test.ts
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    ANONYMOUS_JWT_SECRET: 'test-secret',
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
    NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.me',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
  },
}));
vi.mock('@/server/db', () => ({ default: { site: { create: vi.fn(), count: vi.fn() } } }));
vi.mock('@/lib/typesense', () => ({ createSiteCollection: vi.fn() }));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({ capture: vi.fn(), captureException: vi.fn(), shutdown: vi.fn() }),
}));

import prisma from '@/server/db';
import { verifySiteClaimToken } from '@/lib/anonymous-user';
import { POST } from './route';

const create = prisma.site.create as ReturnType<typeof vi.fn>;
const count = prisma.site.count as ReturnType<typeof vi.fn>;

function req() {
  return new NextRequest('http://localhost/api/sites/anon', {
    method: 'POST',
    body: '{}',
    headers: { 'x-forwarded-for': '9.9.9.9' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  count.mockResolvedValue(0);
  create.mockImplementation(async ({ data }) => ({ id: 'site-1', ...data }));
});

describe('POST /api/sites/anon', () => {
  it('creates a temporary anonymous site and returns a claim token + URL', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = create.mock.calls[0][0].data;
    expect(data.isTemporary).toBe(true);
    expect(data.anonCreatorIpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.siteId).toBe('site-1');
    expect(body.liveUrl).toBe(`https://${data.subdomain}.flowershow.me`);
    expect(verifySiteClaimToken(body.claimToken)).toEqual({ siteId: 'site-1', anonymousUserId: data.anonymousOwnerId });
    expect(body.claimUrl).toContain('/claim?siteId=site-1&token=fs_claim_');
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now() + 6.9 * 24 * 3600 * 1000);
  });

  it('returns 429 when the IP is over the limit, creating nothing', async () => {
    count.mockResolvedValue(10);
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter flowershow exec vitest run app/api/sites/anon/route.test.ts`
Expected: FAIL (route module not found).

- [ ] **Step 4: Implement the route**

```ts
// apps/flowershow/app/api/sites/anon/route.ts
import type { AnonCreateSiteResponse } from '@flowershow/api-contract';
import { randomUUID } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { checkAnonCreateLimit, hashIp } from '@/lib/anon-rate-limit';
import { ANONYMOUS_USER_ID, buildClaimUrl, generateSiteClaimToken } from '@/lib/anonymous-user';
import { getClientIp } from '@/lib/rate-limit';
import PostHogClient from '@/lib/server-posthog';
import { SITE_CONFIG_DEFAULTS } from '@/lib/site-config';
import { buildSubdomain } from '@/lib/site-subdomain';
import { createSiteCollection } from '@/lib/typesense';
import prisma from '@/server/db';

const ANON_SITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/sites/anon
 * Create an empty temporary site for agent/CLI publishing without an account.
 * Files are then uploaded via POST /api/sites/id/:siteId/sync with
 * `Authorization: Bearer <claimToken>`. The site expires in 7 days unless claimed.
 */
export async function POST(request: NextRequest) {
  const posthog = PostHogClient();
  try {
    const ipHash = hashIp(getClientIp(request.headers));
    if (!(await checkAnonCreateLimit(ipHash))) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many anonymous sites from this network. Try again later, or run `fl login`.' },
        { status: 429 },
      );
    }

    const projectName = Math.random().toString(36).substring(2, 10);
    const anonymousUserId = randomUUID();
    const expiresAt = new Date(Date.now() + ANON_SITE_TTL_MS);

    const site = await prisma.site.create({
      data: {
        projectName,
        subdomain: buildSubdomain(projectName, 'anon'),
        userId: ANONYMOUS_USER_ID,
        anonymousOwnerId: anonymousUserId,
        anonCreatorIpHash: ipHash,
        isTemporary: true,
        expiresAt,
        configJson: SITE_CONFIG_DEFAULTS,
      },
    });
    await createSiteCollection(site.id);

    const isSecure = env.NEXT_PUBLIC_VERCEL_ENV === 'production' || env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
    const claimToken = generateSiteClaimToken(site.id, anonymousUserId);
    const response: AnonCreateSiteResponse = {
      siteId: site.id,
      projectName,
      liveUrl: `${isSecure ? 'https' : 'http'}://${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`,
      claimToken,
      claimUrl: buildClaimUrl(site.id, claimToken),
      expiresAt: expiresAt.toISOString(),
    };

    posthog.capture({ distinctId: site.id, event: 'anon_site_created', properties: { site_id: site.id, source: request.headers.get('x-flowershow-cli-version') ? 'cli' : 'api' } });
    await posthog.shutdown();
    return NextResponse.json(response);
  } catch (error) {
    console.error('Anon site create error:', error);
    posthog.captureException(error, 'system', { route: 'POST /api/sites/anon' });
    await posthog.shutdown();
    return NextResponse.json({ error: 'internal', message: 'Failed to create site. Please try again.' }, { status: 500 });
  }
}
```

Check that `middleware.ts` does not rewrite or block `/api/sites/anon` on the cloud/API host. Compare with how `/api/sites/publish-anon` is reached.

- [ ] **Step 5: Run to verify pass, then commit**

Run: `pnpm --filter flowershow exec vitest run app/api/sites/anon/route.test.ts`
Expected: 2 passed.

```bash
git add packages/api-contract apps/flowershow/app/api/sites/anon
git commit -m "feat(api): POST /api/sites/anon creates an anonymous site with a claim token (flowershow-z4f)"
```

---

### Task 4: Claim-token auth on sync and status, with anonymous limits

**Files:**
- Create: `apps/flowershow/lib/site-auth.ts`
- Modify: `apps/flowershow/lib/publish-limits.ts` (add `validateAnonPublishFiles`)
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/sync/route.ts`, `apps/flowershow/app/api/sites/id/[siteId]/status/route.ts`
- Test: `apps/flowershow/lib/site-auth.test.ts`, `apps/flowershow/lib/publish-limits.test.ts` (create or extend)

**Interfaces:**
- Consumes: Task 1 (`verifySiteClaimToken`, `ANONYMOUS_USER_ID`).
- Produces:
  - `authorizeSiteRequest(request: NextRequest, siteId: string): Promise<SiteAuthResult>`, where
    `type SiteAuthResult = { ok: true; kind: 'user'; userId: string } | { ok: true; kind: 'anon'; siteId: string } | { ok: false; response: NextResponse }`.
  - `validateAnonPublishFiles(files: FileMetadata[]): NextResponse | null` (200 files, 50 MB total, then delegates to `validatePublishFiles`).

- [ ] **Step 1: Write the failing tests**

```ts
// apps/flowershow/lib/site-auth.test.ts
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({ env: { ANONYMOUS_JWT_SECRET: 'test-secret' } }));
vi.mock('@/server/db', () => ({ default: { site: { findUnique: vi.fn() } } }));
vi.mock('@/lib/cli-auth', () => ({ validateAccessToken: vi.fn() }));

import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';
import { ANONYMOUS_USER_ID, generateSiteClaimToken } from './anonymous-user';
import { authorizeSiteRequest } from './site-auth';

const findUnique = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const validate = validateAccessToken as ReturnType<typeof vi.fn>;
const ANON = '3f1c2b7a-1d2e-4f3a-9b4c-5d6e7f8a9b0c';
const future = new Date(Date.now() + 86400000);

function req(token?: string) {
  return new NextRequest('http://localhost/api/sites/id/site-1/sync', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  validate.mockResolvedValue(null);
});

describe('authorizeSiteRequest', () => {
  it('accepts the owner user token', async () => {
    validate.mockResolvedValue({ userId: 'u1' });
    findUnique.mockResolvedValue({ id: 'site-1', userId: 'u1' });
    const r = await authorizeSiteRequest(req('fs_pat_x'), 'site-1');
    expect(r).toEqual({ ok: true, kind: 'user', userId: 'u1' });
  });

  it('accepts a claim token for its own anonymous, unexpired site', async () => {
    findUnique.mockResolvedValue({ id: 'site-1', userId: ANONYMOUS_USER_ID, anonymousOwnerId: ANON, expiresAt: future });
    const r = await authorizeSiteRequest(req(generateSiteClaimToken('site-1', ANON)), 'site-1');
    expect(r).toEqual({ ok: true, kind: 'anon', siteId: 'site-1' });
  });

  it('rejects a claim token for a different site (403)', async () => {
    findUnique.mockResolvedValue({ id: 'site-2', userId: ANONYMOUS_USER_ID, anonymousOwnerId: ANON, expiresAt: future });
    const r = await authorizeSiteRequest(req(generateSiteClaimToken('site-1', ANON)), 'site-2');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it('rejects a claim token once the site has been claimed (403)', async () => {
    findUnique.mockResolvedValue({ id: 'site-1', userId: 'u1', anonymousOwnerId: null, expiresAt: null });
    const r = await authorizeSiteRequest(req(generateSiteClaimToken('site-1', ANON)), 'site-1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it('returns 410 for an expired anonymous site', async () => {
    findUnique.mockResolvedValue({ id: 'site-1', userId: ANONYMOUS_USER_ID, anonymousOwnerId: ANON, expiresAt: new Date(Date.now() - 1000) });
    const r = await authorizeSiteRequest(req(generateSiteClaimToken('site-1', ANON)), 'site-1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(410);
  });

  it('returns 401 with no token and 404 for a missing site', async () => {
    let r = await authorizeSiteRequest(req(), 'site-1');
    expect(!r.ok && r.response.status).toBe(401);
    findUnique.mockResolvedValue(null);
    r = await authorizeSiteRequest(req(generateSiteClaimToken('site-1', ANON)), 'site-1');
    expect(!r.ok && r.response.status).toBe(404);
  });
});
```

```ts
// apps/flowershow/lib/publish-limits.test.ts (add)
import { describe, expect, it } from 'vitest';
import { validateAnonPublishFiles } from './publish-limits';

const f = (i: number, size = 10) => ({ path: `p${i}.html`, size, sha: `s${i}` });

describe('validateAnonPublishFiles', () => {
  it('allows HTML-only sets within limits', () => {
    expect(validateAnonPublishFiles([f(1), f(2)])).toBeNull();
  });
  it('rejects more than 200 files', () => {
    expect(validateAnonPublishFiles(Array.from({ length: 201 }, (_, i) => f(i)))?.status).toBe(413);
  });
  it('rejects more than 50 MB total', () => {
    expect(validateAnonPublishFiles([f(1, 30 * 1024 * 1024), f(2, 21 * 1024 * 1024)])?.status).toBe(413);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter flowershow exec vitest run lib/site-auth.test.ts lib/publish-limits.test.ts`
Expected: FAIL (modules/exports missing).

- [ ] **Step 3: Implement `site-auth.ts` and `validateAnonPublishFiles`**

```ts
// apps/flowershow/lib/site-auth.ts
import { type NextRequest, NextResponse } from 'next/server';
import { ANONYMOUS_USER_ID, CLAIM_TOKEN_PREFIX, verifySiteClaimToken } from '@/lib/anonymous-user';
import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

export type SiteAuthResult =
  | { ok: true; kind: 'user'; userId: string }
  | { ok: true; kind: 'anon'; siteId: string }
  | { ok: false; response: NextResponse };

const deny = (status: number, error: string, message: string): SiteAuthResult => ({
  ok: false,
  response: NextResponse.json({ error, message }, { status }),
});

/**
 * Authorize a request against one site. Accepts the site owner's CLI/PAT token,
 * or a site-scoped claim token (fs_claim_…) for that same anonymous, unexpired site.
 */
export async function authorizeSiteRequest(request: NextRequest, siteId: string): Promise<SiteAuthResult> {
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (bearer.startsWith(CLAIM_TOKEN_PREFIX)) {
    const claim = verifySiteClaimToken(bearer);
    if (!claim) return deny(401, 'unauthorized', 'Invalid claim token');
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, userId: true, anonymousOwnerId: true, expiresAt: true },
    });
    if (!site) return deny(404, 'not_found', 'Site not found');
    if (claim.siteId !== site.id || site.userId !== ANONYMOUS_USER_ID || site.anonymousOwnerId !== claim.anonymousUserId) {
      return deny(403, 'forbidden', 'This claim token is not valid for this site (it may already have been claimed)');
    }
    if (site.expiresAt && site.expiresAt.getTime() <= Date.now()) {
      return deny(410, 'expired', 'This anonymous site has expired');
    }
    return { ok: true, kind: 'anon', siteId: site.id };
  }

  const auth = await validateAccessToken(request);
  if (!auth?.userId) return deny(401, 'unauthorized', 'Not authenticated');
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, userId: true } });
  if (!site) return deny(404, 'not_found', 'Site not found');
  if (site.userId !== auth.userId) return deny(403, 'forbidden', 'You do not have access to this site');
  return { ok: true, kind: 'user', userId: auth.userId };
}
```

In `apps/flowershow/lib/publish-limits.ts` add:

```ts
export const ANON_MAX_FILES = 200;
export const ANON_MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

/** Tighter limits for anonymous (claim-token) publishes; then the normal checks. */
export function validateAnonPublishFiles(files: FileMetadata[]): NextResponse | null {
  if (files.length > ANON_MAX_FILES) {
    return NextResponse.json(
      { error: 'payload_too_large', message: `Anonymous sites are limited to ${ANON_MAX_FILES} files. Run \`fl login\` to publish more.` },
      { status: 413 },
    );
  }
  const total = files.reduce((sum, f) => sum + (typeof f.size === 'number' ? f.size : 0), 0);
  if (total > ANON_MAX_TOTAL_SIZE) {
    return NextResponse.json(
      { error: 'payload_too_large', message: 'Anonymous sites are limited to 50 MB in total. Run `fl login` to publish more.' },
      { status: 413 },
    );
  }
  return validatePublishFiles(files);
}
```

- [ ] **Step 4: Use it in the sync and status routes**

In `sync/route.ts`, replace the block from `// Validate access token (CLI or PAT)` through the `site.userId !== auth.userId` check with:

```ts
    const access = await authorizeSiteRequest(request, siteId);
    if (!access.ok) return access.response;
    const distinctId = access.kind === 'user' ? access.userId : `anon:${siteId}`;
```

Then:
- Replace `validatePublishFiles(files)` with `access.kind === 'anon' ? validateAnonPublishFiles(files) : validatePublishFiles(files)`.
- Replace later uses of `auth.userId` (the PostHog `distinctId` near the end of the handler) with `distinctId`.
- Keep `checkCliVersion` and `isLegacyPublishClient` as they are.

In `status/route.ts`, read the handler first. It currently allows unauthenticated reads with extra checks for private sites. Make the minimal change: if the bearer token starts with `fs_claim_`, call `authorizeSiteRequest` and treat `ok` as authenticated for this site; otherwise keep the current logic unchanged.

- [ ] **Step 5: Add a sync route regression test**

Create `apps/flowershow/app/api/sites/id/[siteId]/sync/route.test.ts` following the raw route test's mock style. Mock `@/lib/site-auth` (`authorizeSiteRequest`), `@/server/db` (`blob.findMany → []`, `publish.create`, `publishFile.createMany`/`create` as the route uses them; read the route to mock exactly), `@/lib/content-store` (`generatePresignedUploadUrl → 'https://r2/upload'`), `@/lib/cloudflare-worker`, `@/lib/server-posthog`, `@/lib/otel-logger`. Cases:
- `authorizeSiteRequest` returns `{ ok: true, kind: 'anon', siteId: 'site-1' }` with 201 files → 413.
- The same with 2 `.html` files → 200, and the response has 2 upload URLs.
- `authorizeSiteRequest` returns `{ ok: false, response: NextResponse.json({}, { status: 403 }) }` → 403.

- [ ] **Step 6: Run everything and commit**

Run: `pnpm --filter flowershow exec vitest run lib/site-auth.test.ts lib/publish-limits.test.ts "app/api/sites/id/[siteId]/sync/route.test.ts"` then `pnpm --filter flowershow test:unit`
Expected: all pass (the full suite was 748 tests on 2026-09-30, plus the new ones).

```bash
git add apps/flowershow/lib/site-auth.ts apps/flowershow/lib/site-auth.test.ts apps/flowershow/lib/publish-limits.ts apps/flowershow/lib/publish-limits.test.ts "apps/flowershow/app/api/sites/id/[siteId]"
git commit -m "feat(api): accept site-scoped claim tokens on sync/status for anonymous sites (flowershow-z4f)"
```

---

### Task 5: Claim from a link (token in URL, survives login)

**Files:**
- Modify: `packages/api-contract/src/schemas.ts` (`ClaimSiteRequestSchema`)
- Modify: `apps/flowershow/app/api/sites/claim/route.ts`
- Modify: `apps/flowershow/app/(cloud)/dragndrop/claim/page.tsx`
- Test: `apps/flowershow/app/api/sites/claim/route.test.ts` (create)

**Interfaces:**
- Consumes: Task 1 (`verifySiteClaimToken`).
- Produces: `ClaimSiteRequest = { siteId: string; ownershipToken?: string; claimToken?: string }` (at least one of the two tokens).

- [ ] **Step 1: Change the contract**

```ts
export const ClaimSiteRequestSchema = z
  .object({
    siteId: z.string(),
    ownershipToken: z.string().optional(),
    claimToken: z.string().optional(),
  })
  .refine((v) => !!v.ownershipToken || !!v.claimToken, {
    message: 'ownershipToken or claimToken is required',
  });
```

- [ ] **Step 2: Write the failing route test**

Mock `next-auth` `getServerSession` → `{ user: { id: 'u1' } }`, mock `@/server/db` (`site.findUnique`, `site.count → 0`, `site.update` returning the updated site), mock posthog, and mock env (`ANONYMOUS_JWT_SECRET`). Cases:
- A valid `claimToken` for `site-1`, where the site is anonymous with a matching `anonymousOwnerId` → 200, and `site.update` is called with `{ userId: 'u1', isTemporary: false, expiresAt: null, anonymousOwnerId: null }`.
- A `claimToken` for `site-1` posted with `siteId: 'site-2'` → 403, and no update.
- A legacy `ownershipToken` still works → 200 (regression).
- No session → 401.

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter flowershow exec vitest run app/api/sites/claim/route.test.ts`
Expected: the claimToken cases FAIL (the route requires `ownershipToken`).

- [ ] **Step 4: Implement in the route**

Replace the token verification block with:

```ts
    const { siteId, ownershipToken, claimToken } = parsedBody.data;

    let anonymousUserId: string | null = null;
    if (claimToken) {
      const claim = verifySiteClaimToken(claimToken);
      if (!claim || claim.siteId !== siteId) {
        return NextResponse.json({ success: false, error: 'Invalid claim link for this site' }, { status: 403 });
      }
      anonymousUserId = claim.anonymousUserId;
    } else if (ownershipToken) {
      anonymousUserId = verifyOwnershipToken(ownershipToken);
    }
    if (!anonymousUserId) {
      return NextResponse.json({ success: false, error: 'Invalid ownership token' }, { status: 403 });
    }
```

Keep the rest as is: site lookup, the anonymous check, the `anonymousOwnerId` match and the transfer. Add `claim_method: claimToken ? 'link' : 'browser'` to the `anon_claim_completed` PostHog properties.

- [ ] **Step 5: Update the claim page**

In `claim/page.tsx`:
- Read `const linkToken = searchParams.get('token');`.
- In the unauthenticated redirect, build the callback with both params:
  ```ts
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (linkToken) params.set('token', linkToken);
  const callbackUrl = `${protocol}://${env.NEXT_PUBLIC_HOME_DOMAIN}/claim${params.size ? `?${params}` : ''}`;
  ```
- In `claimSite`, send `linkToken ? { siteId, claimToken: linkToken } : { siteId, ownershipToken }`, and only error on a missing token when both are absent.

- [ ] **Step 6: Run to verify pass, then commit**

Run: `pnpm --filter flowershow exec vitest run app/api/sites/claim/route.test.ts` then `pnpm --filter flowershow exec tsc --noEmit`
Expected: pass, no type errors.

```bash
git add packages/api-contract apps/flowershow/app/api/sites/claim "apps/flowershow/app/(cloud)/dragndrop/claim/page.tsx"
git commit -m "feat(claim): claim anonymous sites from a link with a site-scoped token (flowershow-z4f)"
```

---

### Task 6: Expired anonymous sites stop serving; anonymous sites are noindex

**Files:**
- Modify: `apps/flowershow/server/api/routers/site.ts` (`getAnonymous`)
- Modify: the public page metadata: find it with `grep -n "generateMetadata" "apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx"`.
- Modify: `apps/flowershow/app/api/raw/[username]/[projectName]/[[...path]]/route.ts`
- Test: `apps/flowershow/server/api/routers/__tests__/site.test.ts` (extend), raw `route.test.ts` (extend)

**Interfaces:**
- Consumes: `ANONYMOUS_USER_ID`.

- [ ] **Step 1: Write the failing tests**

- `site.test.ts`: `getAnonymous` must call `findFirst` with a `where` including `OR: [{ expiresAt: null }, { expiresAt: { gt: <Date> } }]`. Follow the existing test setup in that file for calling procedures.
- Raw route test: for a site with `userId: ANONYMOUS_USER_ID`, the response has the header `x-robots-tag: noindex`; for a normal site it doesn't.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter flowershow exec vitest run server/api/routers/__tests__/site.test.ts "app/api/raw"`
Expected: the new cases FAIL.

- [ ] **Step 3: Implement**

In `getAnonymous`:

```ts
        where: {
          projectName: input.projectName,
          userId: ANONYMOUS_USER_ID,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
```

In the raw route, where the response (the redirect or the file) is built, add `headers.set('X-Robots-Tag', 'noindex')` when `site.userId === ANONYMOUS_USER_ID`. Make sure `userId` is in the route's site `select`.

In the page's `generateMetadata`, when the resolved site is anonymous (`site.isTemporary && site.anonymousOwnerId`, the same condition `layout.tsx` uses for its banner), return `robots: { index: false, follow: false }` merged into the existing metadata object.

- [ ] **Step 4: Run to verify pass, then commit**

Run: the same vitest command, then `pnpm --filter flowershow test:unit`
Expected: all pass.

```bash
git add apps/flowershow/server apps/flowershow/app
git commit -m "fix(anon): hide expired anonymous sites and mark anonymous sites noindex (flowershow-z4f)"
```

---

### Task 7: CLI: `--anon` publish and `FLOWERSHOW_TOKEN`

**Files:**
- Modify: `apps/cli/internal/auth/auth.go` (`GetToken`)
- Modify: `apps/cli/internal/api/client.go` (`CreateAnonSite`, token override)
- Modify: `apps/cli/internal/localconfig/localconfig.go` (anon fields)
- Modify: `apps/cli/cmd/root.go` (flag), `apps/cli/cmd/publish.go`
- Test: `apps/cli/cmd/publish_test.go`, `apps/cli/cmd/fakeapi_test.go` (add `/api/sites/anon`), `apps/cli/internal/auth/auth_test.go` (create)

**Interfaces:**
- Consumes: `POST /api/sites/anon` (Task 3), claim-token-authorised sync/status (Task 4).
- Produces:
  - Go: `api.CreateAnonSite() (*AnonCreateSiteResponse, error)`, mirroring the TS type (`SiteID`, `ProjectName`, `LiveURL`, `ClaimToken`, `ClaimURL`, `ExpiresAt` with JSON tags matching Task 3).
  - Go: `api.SetTokenOverride(token string)`; when non-empty, `Request()` uses it instead of `auth.GetToken()`.
  - `localconfig.Config` gains `SiteID string \`json:"siteId,omitempty"\``, `ClaimToken string \`json:"claimToken,omitempty"\``, `ExpiresAt string \`json:"expiresAt,omitempty"\``, `Anon bool \`json:"anon,omitempty"\``. `Read` must accept a config with `Anon && SiteID != ""` even if `SiteName == ""`.
  - Flag: `--anon`, "Publish without an account. The site expires in 7 days unless claimed; prints a claim link."

- [ ] **Step 1: Write the failing tests**

In `auth_test.go`:

```go
func TestGetTokenPrefersEnv(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("FLOWERSHOW_TOKEN", "fs_pat_env")
	td, err := GetToken()
	if err != nil || td == nil || td.Token != "fs_pat_env" {
		t.Fatalf("expected env token, got %+v, %v", td, err)
	}
}
```

In `publish_test.go`, using the existing fake API helpers (add a handler for `POST /api/sites/anon` that returns a fixed `AnonCreateSiteResponse`, and make the fake sync/status handlers accept `Bearer fs_claim_test` for that site ID):
- `TestPublishNotLoggedInWithoutAnonFails`: no token, `fl --yes <dir>` → error (exit 1); the message contains `fl login` and `--anon`; the fake API received no create or sync calls.
- `TestPublishAnonFolder`: no token, `fl --anon --yes <dir>` → success. The anon endpoint and sync were called with `Authorization: Bearer fs_claim_test`. Output contains the live URL, the claim URL and "expires". `<dir>/.flowershow` contains `"anon": true`, the `siteId` and the `claimToken`.
- `TestPublishAnonFolderRepublishUsesSameSite`: run the previous case twice; the second run makes no new create call and syncs to the same site ID.
- `TestPublishAnonSingleFile`: `fl --anon --yes <file.html>` → success; no `.flowershow` is written; the output tells the user that single files can't be updated anonymously, and to publish a folder or log in instead.

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/cli && go test ./...`
Expected: the new tests FAIL.

- [ ] **Step 3: Implement**

- `auth.GetToken()`: first, `if v := os.Getenv("FLOWERSHOW_TOKEN"); v != "" { return &TokenData{Token: v}, nil }`. Check where `TokenData.Username` is used. `publish` calls `auth.GetUserInfo`, which resolves the username from the API, so an env token works without a username.
- `api.Request()`: `if tokenOverride != "" { req.Header.Set("Authorization", "Bearer "+tokenOverride) } else { … existing GetToken logic … }`.
- `publish.go`, at the top of `runPublish` (new `anon bool` parameter wired from the flag in `root.go`):
  - If `anon`: skip the authentication block, then:
    1. In folder mode, read `.flowershow`. If it has `Anon && SiteID != "" && ClaimToken != ""`, reuse them: set the override, and call the existing `doSync` for that site ID. The site's display URL comes from the saved config; add `LiveURL` to the config too if `doSync` needs it.
    2. Otherwise call `api.CreateAnonSite()`, set the override to `ClaimToken`, and run the same upload path used for new sites: `SyncFiles` → `UploadToR2` → status polling. In folder mode, write `.flowershow` with the anon fields.
    3. Print:
       ```
       ✓ Published (no account): <liveUrl>
       Claim it to keep it (expires <date>): <claimUrl>
       ```
       and, for single files, "Single files can't be updated without an account. Publish a folder, or run `fl login`."
  - If not `anon` and not authenticated: `return fail("You're not logged in.\nRun `fl login` to publish to your account, or `fl --anon <path>` to publish without an account (expires in 7 days unless claimed).")`.
  - Name-clash logic (2.4.0) does not apply to anonymous sites: names are random.
- If the server returns 410 (expired) or 403 on a republish from a saved anon config, print "This anonymous site has expired or been claimed. Run again without the saved config to create a new one, or log in." Then remove the anon fields from `.flowershow` and exit 1.
- Bump `internal/config/config.go` `Version = "2.5.0"`, and add an `apps/cli/CHANGELOG.md` entry `## 2.5.0` describing `--anon` and `FLOWERSHOW_TOKEN`.

- [ ] **Step 4: Run to verify pass**

Run: `cd apps/cli && go vet ./... && go test ./...`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/cli
git commit -m "feat(cli): fl --anon publishes without an account and prints a claim link; FLOWERSHOW_TOKEN env auth (flowershow-z4f)"
```

---

### Task 8: Docs, changelog, skill

**Files:**
- Modify: `content/flowershow-app/docs/reference/cli.md` (new "Publish without an account" and "Environment token" sections), `content/flowershow-app/docs/agents/supported-agents.md` (a short note for cloud/headless agents: `FLOWERSHOW_TOKEN` with a PAT from `https://cloud.flowershow.app/tokens`, or `--anon`)
- Create: `content/flowershow-app/changelog/<release-date>-publish-without-an-account.md`
- Separate PR in `flowershow/skills`: SKILL.md + changeset

- [ ] **Step 1: Docs**

In `cli.md`, add sections with these facts:
- `fl --anon ./folder` needs no account.
- The site lives at a random `…-anon.flowershow.me` URL and expires in 7 days.
- Open the printed claim link to keep it; you'll be asked to sign in or sign up.
- Re-running on the same folder updates the same URL.
- Limits: 200 files, 50 MB in total.
- Anonymous sites aren't indexed by search engines.
- `FLOWERSHOW_TOKEN=fs_pat_… fl ./folder` authenticates without `fl login`, for CI and cloud agents.

- [ ] **Step 2: Changelog** (AGENTS.md format, `authors: - rufuspollock`): "Publish without an account", with a two-line summary and links to the CLI docs.

- [ ] **Step 3: Skill PR** (`flowershow/skills`, clone to scratch, branch `feat/anon-publish`):
- In "Authentication": if the user isn't logged in and just wants a link now, use `fl --anon --yes <path>` and **paste the claim link to the user verbatim**, telling them the site expires in 7 days unless they claim it.
- Prefer `fl login` for anything they want to keep or put on a custom domain.
- For cloud or headless agents, use `FLOWERSHOW_TOKEN` with a PAT.
- Require fl ≥ 2.5.0 for `--anon`.
- Add a changeset (`minor`). Merge only after the CLI release in Task 9.

- [ ] **Step 4: Commit docs**

```bash
git add content/flowershow-app
git commit -m "docs: publish without an account (fl --anon) and FLOWERSHOW_TOKEN (flowershow-z4f)"
```

---

### Task 9: Ship and verify end to end

- [ ] **Step 1:** Push, open the PR (`Closes` nothing on GitHub; reference beads `flowershow-z4f` and `flowershow-56f`), and get it reviewed and merged. The Prisma migration runs on deploy (`build` runs `prisma migrate deploy`).
- [ ] **Step 2:** After the deploy is live, verify against production with the released binary:
```bash
git tag -a cli/v2.5.0 <merge-sha> -m "fl 2.5.0: --anon publish with claim link; FLOWERSHOW_TOKEN" && git push origin cli/v2.5.0
# after the release workflow succeeds:
D=$(mktemp -d); echo '<h1>anon test</h1>' > $D/index.html
HOME=$(mktemp -d) fl --anon --yes $D        # no login: prints live URL + claim URL, exit 0
curl -sI <liveUrl>/index.html | grep -i x-robots-tag   # noindex
echo '<h1>anon test v2</h1>' > $D/index.html
HOME=$(mktemp -d) fl --anon --yes $D        # same URL, updated content (the .flowershow in $D carries the token)
HOME=$(mktemp -d) fl --yes $D; echo $?      # without --anon: exit 1, message mentions --anon
```
- [ ] **Step 3 (Rufus, in a browser):** open the claim URL while logged out, sign in, and confirm you land on the site's settings page and the site is now yours (no expiry banner).
- [ ] **Step 4:** Merge the skills PR, then its version PR. Update `flowershow-z4f` with results and close it.

---

## Follow-ups (not in this plan)

- MCP server v1 on this API: `docs/plans/2026-09-30-mcp-server-v1-plan.md` (bead `flowershow-5fv`).
- Move drag-and-drop onto `/api/sites/anon` + claim links, and retire the browser-wide token.
- Abuse reporting link on anonymous sites; content scanning if abuse appears.
