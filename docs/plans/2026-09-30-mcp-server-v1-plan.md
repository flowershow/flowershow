# Flowershow MCP Server v1 Implementation Plan

> **Amended 2026-10-02 (ADR 0014):** implemented inside the main app at `/api/mcp` (web-standard Streamable HTTP transport, sync/status called in-process) instead of reviving the Express app as a separate Vercel project at `mcp.flowershow.app`, so Task 5's Vercel project and DNS aren't needed. The ADR is 0014 (0006 was already taken). MCP-created anonymous sites share one global hourly bucket (`MCP_ANON_HOURLY_LIMIT`), since chat apps call from their own IPs. Code: `apps/flowershow/lib/mcp/`, `apps/flowershow/app/api/mcp/route.ts`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hosted, remote MCP server (`https://mcp.flowershow.app/mcp`) that lets chat apps with no shell (claude.ai / Claude Desktop connectors, ChatGPT apps/connectors) publish a page or small site to Flowershow **in one tool call, with no account**, returning a live URL and a claim link. Account holders can optionally pass a PAT to publish into their own sites.

**Architecture:** Revive `apps/flowershow-mcp` from git history (removed in `2242634e`, ADR 0005). It is a stateless Streamable-HTTP MCP server on Express (`@modelcontextprotocol/sdk`) that calls the Flowershow REST API. The v1 tool surface is centred on a new `publish` tool that takes **file contents in the request** (not paths), because cloud agents can't read local files; that was the blocker that killed the February version. Without auth, `publish` uses the anonymous API from the anonymous-publish plan: `POST /api/sites/anon` creates the site and returns a claim token, then it syncs with the claim token, uploads to the presigned URLs and polls status. It returns `{ liveUrl, claimUrl, expiresAt, siteId, claimToken }`, so the model can call `publish` again with `siteId` + `claimToken` to update the same URL in the same chat. With `Authorization: Bearer fs_pat_…`, the same tool publishes to the caller's site. OAuth is v2 (`docs/plans/2026-02-20-mcp-oauth.md`).

**Tech Stack:** TypeScript, Node ≥ 20, Express 5, `@modelcontextprotocol/sdk` (current 1.x), zod, vitest; `@flowershow/api-contract` for API types; deploy as a Vercel project (the old entry point exports the Express app as default for Vercel).

**Spec:** Decision bead `flowershow-56f` (closed 2026-09-30: Rufus and Ola agree to revive MCP; order is anonymous publish first, then MCP v1 on the same API, OAuth v2) and bead `flowershow-5fv` (its notes have the history). Evidence: `product/research/2026-10-here-now-teardown.md` (here.now has no MCP, so the in-chat lane is open) and `product/research/2026-10-ai-publishing-landscape.md` (gap #1). **Depends on** `docs/plans/2026-09-30-agent-anon-publish-plan.md` being merged and deployed (`POST /api/sites/anon`, claim-token auth on sync/status).

## Background the implementer needs

- Old implementation: `git show 2242634e^ --stat -- apps/flowershow-mcp` and `git show 2242634e^:apps/flowershow-mcp/<file>` (use quotes or `${P}` in zsh). Key files:
  - `src/app.ts`: Express app, stateless per-request server, required a PAT (`extractPat`). v1 makes the PAT optional.
  - `src/lib/api.ts`: `FlowershowApi` client (Bearer PAT).
  - `src/tools/sites.ts`, `user.ts`, `notes.ts`: `list-sites`, `get-site`, `get-user`, `create-site`, `publish-note` (with polling), `publish-local-files`, `get-publish-status`.
  - `src/contracts.ts`: the tool input shapes.
  - Tests live next to each file (vitest).
- ADR 0005 (`docs/adr/0005-cli-over-mcp-for-agent-integration.md`) is superseded by this work; Task 1 writes ADR 0006.
- File SHAs: the sync API diffs on the sha the client sends against `Blob.sha`, which uses **git blob SHA-1** (`sha1("blob " + byteLength + "\0" + bytes)`; see `apps/cli/CHANGELOG.md` 2.0.6 and the CLI's `internal/files`). The old `publish-note` used sha256; v1 must use git blob SHA-1, otherwise republishes re-upload everything.
- Chat clients: Claude (custom connectors) and ChatGPT (developer-mode apps/connectors) both support remote MCP servers **without auth**; that's the v1 path. Verify the current setup steps for each while writing the docs (Task 6) and state them exactly.

## Global Constraints

- Endpoint: `POST /mcp` (Streamable HTTP, stateless). Host: `mcp.flowershow.app`. Health: `GET /healthz` returns `200 ok`.
- Auth is optional. No `Authorization` header means anonymous mode; `Bearer fs_pat_…` means account mode. Any other bearer → JSON-RPC error `-32001` "Invalid token".
- `publish` limits per call: ≤ 50 files; ≤ 5 MB total decoded content; paths are relative, with no `..`, no leading `/`, and no NUL bytes. Text goes in `content` (utf-8); binary goes in `contentBase64`.
- Anonymous `publish` responses must include `claimUrl` and a `message` telling the model to show the claim link to the user verbatim, and that the site expires in 7 days unless claimed.
- Never log file contents, claim tokens or PATs.
- Version the server `1.0.0`; `name: 'flowershow'`.
- Docs page, changelog entry, and ADR 0006 required; no hard-wrapped Markdown prose.

## Review Focus

1. **Update with a claim token for another site** returns a tool error saying the claim token is invalid for that site (the 403 from the API is surfaced clearly, not as a crash). Tested in Task 3.
2. **Path traversal / absolute paths** (`../x`, `/etc/passwd`, `a/../../b`) are rejected before any API call. Tested in Task 3.
3. **Large payloads:** 51 files or more than 5 MB are rejected with a message suggesting the CLI (`fl`) for bigger sites. Tested in Task 3.
4. **The API returns 429 (anonymous rate limit):** the tool error says to try later or sign in, and nothing is retried in a loop. Tested in Task 3.
5. **Publish finishes but pages 404 for a few seconds** (known lag, bead `flowershow-w5n`): `publish` polls status until `complete`, then returns. The message says a first load can take a few seconds. Tested in Task 3 (polling stops on `complete`, times out gracefully).

---

## File Structure

- Restore `apps/flowershow-mcp/**` from `2242634e^`, then:
  - `src/app.ts`: PAT optional; `/healthz`.
  - `src/lib/api.ts`: optional PAT; `createAnonSite`, `syncFiles(siteId, files, bearer)`, `uploadToPresignedUrl`, `getStatus(siteId, bearer)`.
  - `src/lib/git-sha.ts` (new): `gitBlobSha(bytes: Uint8Array): string`.
  - `src/tools/publish.ts` (new): the `publish` tool.
  - `src/contracts.ts`: `publishInputShape`.
  - Keep `list-sites`, `get-site`, `get-user` (PAT only). Drop `publish-local-files` and `publish-note` (superseded by `publish`).
- `docs/adr/0006-revive-mcp-for-in-chat-publishing.md` (new).
- `content/flowershow-app/docs/agents/mcp.md` (new), `docs/agents/README.mdx` (link), changelog entry.
- `pnpm-workspace.yaml` / `turbo.json` if they need the package re-added.

---

### Task 1: ADR 0006 and restore the package

**Files:**
- Create: `docs/adr/0006-revive-mcp-for-in-chat-publishing.md`
- Restore: `apps/flowershow-mcp/**`

- [ ] **Step 1: Write the ADR** (same style as ADR 0005). Content:
  - **Context:** ADR 0005 dropped MCP because target users had shells. Research on 2026-09-30 (product repo `research/`) found:
    - chat apps now own a lot of publishing
    - the no-shell lane is open (here.now has no MCP)
    - agent directories require MCP
    - Rufus and Ola agreed on 2026-09-30 (bead `flowershow-56f`)
  - **Decision:** revive a remote MCP server, in two steps:
    - v1: no auth; publish content in the request; anonymous site plus claim link, via `/api/sites/anon`; PAT optional.
    - v2: OAuth.
    - The CLI remains the primary interface for local agents.
  - **Consequences:** a second API client to maintain (kept thin, over `@flowershow/api-contract`), an abuse surface (covered by the anon rate limit, noindex and 7-day expiry), and a Vercel project plus DNS.
  - Mark ADR 0005 "Superseded by 0006" (edit its top line).

- [ ] **Step 2: Restore the code**

```bash
git checkout 2242634e^ -- apps/flowershow-mcp
pnpm install
pnpm --filter @flowershow/mcp test
```
Expected: the old tests pass, or fail only because of `@flowershow/api-contract` drift. Fix any type drift before moving on, then commit:

```bash
git add docs/adr apps/flowershow-mcp pnpm-lock.yaml
git commit -m "chore(mcp): restore apps/flowershow-mcp from history; ADR 0006 supersedes 0005 (flowershow-5fv)"
```

---

### Task 2: Optional auth, health check, API client additions, git blob SHA

**Files:**
- Modify: `apps/flowershow-mcp/src/app.ts`, `src/lib/api.ts`
- Create: `apps/flowershow-mcp/src/lib/git-sha.ts`
- Test: `src/app.test.ts`, `src/http.test.ts` (existing; update), `src/lib/git-sha.test.ts`, `src/lib/api.test.ts` (create)

**Interfaces:**
- Produces:
  - `gitBlobSha(bytes: Uint8Array): string` (hex sha1 of `blob <len>\0<bytes>`).
  - `new FlowershowApi(baseUrl: string, pat?: string | null)`.
  - `api.createAnonSite(): Promise<AnonCreateSiteResponse>`.
  - `api.syncFiles(siteId: string, files: { path: string; size: number; sha: string }[], bearer?: string): Promise<SyncResponse>`, where `bearer` defaults to the PAT.
  - `api.upload(url: string, bytes: Uint8Array, contentType: string, publishId?: string): Promise<void>`. It sends `x-amz-meta-publish-id` if the CLI does (mirror `UploadToR2` in `apps/cli/internal/api/client.go`).
  - `api.getStatus(siteId: string, bearer?: string): Promise<SiteStatusResponse>`.
  - `ApiError { status: number; code?: string; message: string }` (the existing class).

- [ ] **Step 1: Failing tests**

```ts
// src/lib/git-sha.test.ts
import { describe, expect, it } from 'vitest';
import { gitBlobSha } from './git-sha.js';

describe('gitBlobSha', () => {
  it('matches `git hash-object` for "hello\\n"', () => {
    // printf 'hello\n' | git hash-object --stdin
    expect(gitBlobSha(new TextEncoder().encode('hello\n'))).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
  });
  it('handles empty content', () => {
    expect(gitBlobSha(new Uint8Array())).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  });
});
```

In `app.test.ts` / `http.test.ts`, update the "missing PAT → 401" case: a request with **no** `Authorization` now reaches the MCP server (e.g. `tools/list` succeeds and lists `publish`). A request with `Authorization: Bearer garbage` → `-32001`. `GET /healthz` → 200 `ok`.

`src/lib/api.test.ts`: stub `fetch` with `vi.stubGlobal`. `createAnonSite()` POSTs to `<base>/sites/anon` with no Authorization. `syncFiles('s1', files, 'fs_claim_x')` sends `Authorization: Bearer fs_claim_x`. A 429 response throws `ApiError` with `status: 429`.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @flowershow/mcp test`
Expected: the new cases FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/git-sha.ts
import { createHash } from 'node:crypto';

/** Git blob SHA-1, the hash the Flowershow sync API uses to diff files (same as the fl CLI). */
export function gitBlobSha(bytes: Uint8Array): string {
  return createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
}
```

In `app.ts`:
- `extractPat` returns `{ kind: 'none' } | { kind: 'pat'; token } | { kind: 'invalid' }`. `fs_pat_` and `fs_cli_` prefixes are valid PATs; anything else is `invalid`, which returns `-32001`.
- Construct `new FlowershowApi(apiBaseUrl, pat ?? null)`.
- Register PAT-only tools (`list-sites`, `get-site`, `get-user`) only when a PAT is present, and always register `publish`.
- Add `app.get('/healthz', (_req, res) => res.type('text').send('ok'))`.

In `api.ts`, make the PAT optional (omit the header when null), and add the methods above using the contract types from `@flowershow/api-contract` (`AnonCreateSiteResponse`, `SyncResponse`, and the status type the CLI uses). Paths: API base `https://flowershow.app/api`, so `POST /sites/anon`, `POST /sites/id/:id/sync`, `GET /sites/id/:id/status`. Check them against the anonymous-publish plan and the old client's base-URL convention.

- [ ] **Step 4: Run to verify pass, then commit**

Run: `pnpm --filter @flowershow/mcp test`
Expected: all pass.

```bash
git add apps/flowershow-mcp
git commit -m "feat(mcp): optional auth, /healthz, anon + sync API client, git blob sha (flowershow-5fv)"
```

---

### Task 3: The `publish` tool

**Files:**
- Create: `apps/flowershow-mcp/src/tools/publish.ts`, `src/tools/publish.test.ts`
- Modify: `src/contracts.ts` (add `publishInputShape`), `src/app.ts` (register), delete `src/tools/notes.ts` + its test (superseded)

**Interfaces:**
- Consumes: Task 2 API client, `gitBlobSha`.
- Produces: tool `publish` with input:
  ```ts
  {
    files: { path: string; content?: string; contentBase64?: string }[]; // 1..50, exactly one of content/contentBase64
    siteId?: string;       // update an existing site
    claimToken?: string;   // required with siteId in anonymous mode
  }
  ```
  and a structured result (also rendered as text):
  ```ts
  { liveUrl: string; siteId: string; claimUrl?: string; claimToken?: string; expiresAt?: string; message: string }
  ```

- [ ] **Step 1: Failing tests** (`publish.test.ts`; fake `FlowershowApi` object with `vi.fn()` methods; call the tool handler directly, the way the old `notes.test.ts` did):
1. **Anonymous new site:** no PAT, 2 files (`index.html` as `content`, `logo.png` as `contentBase64`). Expect `createAnonSite` called once; `syncFiles` called with `siteId`, paths, sizes of the decoded bytes, `gitBlobSha` shas, and bearer = claimToken; `upload` called for each URL returned; `getStatus` polled until `complete`. Result has `liveUrl`, `claimUrl`, `claimToken`, `expiresAt`, and a `message` containing "claim" and "7 days".
2. **Anonymous update:** `siteId` + `claimToken` given. No `createAnonSite`; sync uses that claim token.
3. **Wrong claim token:** `syncFiles` rejects with `ApiError(403)`. The tool returns `isError: true`, with text containing "claim token is not valid for this site".
4. **Path validation:** each of `../x.md`, `/abs.md`, `a/../../b.md`, `a\0b.md` → `isError`; no API call made.
5. **Limits:** 51 files → `isError` mentioning `fl` (the CLI); total decoded size above 5 MB → `isError`.
6. **429:** `createAnonSite` rejects with `ApiError(429)` → `isError` mentioning "try again later" or signing in; `createAnonSite` called exactly once.
7. **Status timeout:** `getStatus` never returns `complete` within `maxPollAttempts` → success result with `liveUrl`, and a `message` saying publishing is still finishing and the page may take a moment.
8. **PAT mode:** API constructed with a PAT and `siteId` given. Sync uses the PAT (bearer undefined); the result has no `claimUrl`.
9. **Neither content nor contentBase64**, or both → `isError`.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @flowershow/mcp test src/tools/publish.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement** `registerPublishTool(server, api, opts?: { pollIntervalMs?: number; maxPollAttempts?: number })`:
- Validate the input (zod shape in `contracts.ts`, plus the path checks: reject if `path.startsWith('/')`, `path.includes('\0')`, or `path.split('/').includes('..')`, after normalising `\` to `/`).
- Decode each file to bytes: `content` via `TextEncoder`, `contentBase64` via `Buffer.from(b64, 'base64')`. Enforce the 50-file / 5 MB limits.
- Resolve the target:
  - If `siteId` is given: anonymous mode requires `claimToken` (bearer = claimToken); PAT mode uses the PAT.
  - If not: anonymous mode calls `createAnonSite()` (bearer = its claimToken); PAT mode returns an `isError` asking for a `siteId` (use `list-sites`). Keep v1 small: no site creation in PAT mode.
- `syncFiles(siteId, metadata, bearer)`, then `upload` for every entry in the response's upload and update URL lists (field names per the contract's `SyncResponse`; mirror the CLI's handling in `apps/cli/cmd/publish.go` `doSync`), passing the `publishId`.
- Poll `getStatus` every `pollIntervalMs` (default 2000) up to `maxPollAttempts` (default 15) until the status is complete (use the same status field and values the CLI checks).
- Map errors: `ApiError.status` 403 → "claim token is not valid for this site (it may have been claimed or be for another site)"; 410 → "this anonymous site has expired, so publish again without siteId to create a new one"; 429 → "too many anonymous sites from this network, so try again later or sign in"; 413 → pass the API message through.
- Return `content: [{ type: 'text', text: <human summary> }]` plus `structuredContent` with the result object (if the SDK version supports `outputSchema` / `structuredContent`; otherwise JSON in the text).
- The message text for anonymous mode: "Published: <liveUrl>. Show the user this claim link so they can keep the site (it expires in 7 days unless claimed): <claimUrl>. To update this site later in this conversation, call publish again with siteId and claimToken."
- Tool description (this is what the model sees, so write it around the phrases users actually say):
  > "Publish files as a live website on Flowershow and get a shareable URL. Use when the user says 'publish this', 'put this online', 'make this a website', 'share this as a page', or 'host this'. Accepts Markdown (.md, rendered with a theme and navigation) and HTML (.html, served as-is) plus CSS, JS, JSON and images. One page or a whole small site (up to 50 files, 5 MB). No account needed: returns a live URL and a claim link the user opens to keep the site. For bigger sites use the fl CLI."

- [ ] **Step 4: Run to verify pass, then commit**

Run: `pnpm --filter @flowershow/mcp test`
Expected: all pass.

```bash
git add apps/flowershow-mcp
git commit -m "feat(mcp): publish tool: content-in-request, anonymous with claim link, update via claim token (flowershow-5fv)"
```

---

### Task 4: Local end-to-end against a preview or production API

- [ ] **Step 1:** Run `FLOWERSHOW_API_URL=https://flowershow.app/api pnpm --filter @flowershow/mcp dev` (the anonymous-publish plan must be deployed first). Then use the MCP Inspector (`npx @modelcontextprotocol/inspector`) against `http://localhost:3456/mcp` with no auth:
  - Call `publish` with one `index.html` ("mcp test"). Expect a live URL and a claim URL. `curl` the URL: 200 with the content (retry for up to 10 s), and the `X-Robots-Tag: noindex` header.
  - Call `publish` again with `siteId` + `claimToken` and changed content. Same URL, new content.
  - Call `publish` with `../x.md` → a tool error, and no site created.
- [ ] **Step 2:** Record results in `bd note flowershow-5fv`. Test sites expire in 7 days on their own; nothing to delete.

---

### Task 5: Deploy (needs Rufus/Ola for accounts and DNS)

- [ ] **Step 1 (human):** Create a Vercel project for `apps/flowershow-mcp` in the Flowershow team (root directory `apps/flowershow-mcp`, framework "Other", Node 20+). Set the env var `FLOWERSHOW_API_URL=https://flowershow.app/api`. Add the domain `mcp.flowershow.app` (a CNAME per Vercel's instructions). The old code already exports the Express app as default and binds `0.0.0.0` when `VERCEL` is set (`getExpressAppOptions`).
- [ ] **Step 2:** After deploy: `curl -s https://mcp.flowershow.app/healthz` returns `ok`. Repeat Task 4 Step 1 against `https://mcp.flowershow.app/mcp`.
- [ ] **Step 3 (Rufus):** Add it as a custom connector in claude.ai and as an app/connector in ChatGPT developer mode (no auth). Ask each: "Publish a one-page site that says hello from <app>, and give me the link." Confirm both return a live URL and a claim link, and that the claim link works when opened. Record exact setup steps for the docs.

---

### Task 6: Docs, changelog, landing page, skill

**Files:**
- Create: `content/flowershow-app/docs/agents/mcp.md`
- Modify: `content/flowershow-app/docs/agents/README.mdx` (card link), `content/flowershow-app/docs/agents/supported-agents.md` (a "Claude and ChatGPT apps: use the MCP connector" section)
- Modify: `content/flowershow-app/publish-with-ai.md`: FAQ "Which AI agents does it work with?" and the install step. Chat apps now use the connector URL; drop the caveat about the sandbox needing internet access if Task 5 Step 3 confirmed it.
- Create: changelog `content/flowershow-app/changelog/<date>-mcp-connector.md`
- Separate PR in `flowershow/skills` (optional): mention that the MCP connector exists for chat apps.

- [ ] **Step 1:** Write `mcp.md`:
  - what it does
  - the connector URL `https://mcp.flowershow.app/mcp`
  - exact setup steps for Claude (custom connector) and ChatGPT (from Task 5 Step 3)
  - an example prompt
  - limits: 50 files, 5 MB, 7-day expiry unless claimed
  - how to claim
  - PAT mode (header `Authorization: Bearer fs_pat_…`, token from `https://cloud.flowershow.app/tokens`)
  - a pointer to `fl` for bigger sites
- [ ] **Step 2:** Changelog entry (AGENTS.md format, `authors: - rufuspollock`): "Publish from Claude and ChatGPT with the Flowershow connector".
- [ ] **Step 3:** Commit, push, open the PR, get it reviewed and merged. Update `flowershow-5fv` and close it. Directory listings (MCP Registry, Claude Connectors Directory, ChatGPT apps) are bead `flowershow-k8j`; add a note there that the server is live.

```bash
git add content/flowershow-app
git commit -m "docs: Flowershow MCP connector for Claude and ChatGPT (flowershow-5fv)"
```

---

## Follow-ups (not in this plan)

- OAuth (v2) so chat users can publish straight into their account: `docs/plans/2026-02-20-mcp-oauth.md`.
- Directory submissions and a registry `server.json`: bead `flowershow-k8j`.
- An `update-file` tool for single-file edits without resending the whole site (needs a partial-sync API).
