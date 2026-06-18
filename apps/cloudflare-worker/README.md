# Cloudflare Worker — Flowershow Publish Pipeline

A Cloudflare Worker that drives the Flowershow publish pipeline. It combines:

- A **Cloudflare Workflow** (`PublishWorkflow`) that orchestrates each publish — running the full GitHub sync (fetch tree, diff, upload to R2) or acting as a lifecycle owner for presigned-URL uploads (CLI, Obsidian, dashboard).
- A **Queue consumer** that fires on every R2 event: on **PUT**, parses frontmatter, extracts image dimensions, upserts `Blob` records, indexes in Typesense, and atomically signals when all files in a publish are processed; on **DELETE**, removes the `Blob` record and Typesense document.
- **HTTP endpoints** for triggering workflows and a dev-mode adapter for MinIO webhook events.
- A **daily cron** that purges deleted sites from storage, database, and Typesense.

## Architecture

### How a publish works

Two publish paths share one Queue consumer.

**GitHub path** (`POST /sync`):

1. Creates a `Publish` record and starts a `PublishWorkflow` instance (`instanceId = publishId`).
2. Workflow: fetches GitHub tree → diffs against stored `Blob` records → downloads files and uploads to R2 with `publishId` in object metadata → removes deleted files from R2 and creates terminal `PublishFile` rows immediately; Blob record and Typesense cleanup follows async via `DeleteObject` → queue consumer.
3. Each R2 PUT fires a queue event. The consumer reads the file, computes a git-compatible SHA-1, upserts the `Blob`, indexes in Typesense, and flips the `PublishFile` row to `success` (or `error`).
4. After processing each file, the consumer runs an **atomic completion check**: a single `UPDATE ... WHERE NOT EXISTS (uploading rows)` ensures exactly one concurrent consumer sends the `publish-complete` event to the Workflow.
5. The Workflow finalizes the `Publish` record and revalidates Next.js cache tags.

**Presigned path** (`POST /start-lifecycle`) — CLI, Obsidian, dashboard:

1. The Next.js app creates `Publish` + `PublishFile` records and presigned R2 PUT URLs, then calls `/start-lifecycle` to start the Workflow.
2. Workflow calls `step.waitForEvent('publish-complete', { timeout: '1h' })`.
3. Clients upload files directly to R2 → Queue consumer processes each file → same atomic completion check → Workflow finalizes.

**Anonymous path** (no `publishId`): same as presigned but no `Publish` or `PublishFile` records exist; the consumer processes files without attempting lifecycle finalization.

**Timeout**: if the 1-hour Workflow timeout fires before all files are processed, remaining `PublishFile` rows are marked `expired` and the publish is finalized as `error`.

### R2 object key format

```
{siteId}/{branch}/raw/{path}
```

Example: `my-site/main/raw/blog/welcome.md`

### HTTP endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/sync` | Bearer `SYNC_TRIGGER_SECRET` | Start a GitHub-sync Workflow for a site |
| `POST` | `/start-lifecycle` | Bearer `SYNC_TRIGGER_SECRET` | Start a presigned-path Workflow instance |
| `POST` | `/queue` | None (dev only) | Receive MinIO S3 webhook events and enqueue them |
| `GET` | `/health` | None | Health check |

## Local Development

The simplest approach is to run everything from the repo root with `pnpm dev:up`, which starts Postgres, MinIO (with the bucket and webhook pre-configured), the Next.js app, and this worker all at once.

### Option A — run everything together (recommended)

```bash
# From the repo root:
pnpm dev:up
```

This starts:
- **Postgres** on port 5432 (`flowershow-dev` database)
- **MinIO** on port 9000 (console at port 9001) — bucket `flowershow` created, webhook to `localhost:8787/queue` wired up automatically
- The **Next.js app** and this **worker**

To include Typesense (full-text search):

```bash
pnpm dev:up --search
```

### Option B — run only the worker

Use this when you want to work on the worker in isolation.

1. Start infrastructure:

   ```bash
   # From the repo root:
   docker compose up -d postgres minio
   ```

2. Create your local environment file:

   ```bash
   cd apps/cloudflare-worker
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars as needed
   ```

3. Start the worker:

   ```bash
   npm run dev
   ```

   The worker runs at `http://localhost:8787`.

### Environment variables

`.dev.vars` is only used in local development (`npm run dev`). In production and staging, all vars are set via the Cloudflare dashboard.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GITHUB_APP_ID` | Yes | GitHub App ID (for installation token generation) |
| `GITHUB_APP_PRIVATE_KEY` | Yes | Base64-encoded PEM: `base64 -i private-key.pem \| tr -d '\n'` |
| `SYNC_TRIGGER_SECRET` | Yes | Shared secret — must match `CF_SYNC_WORKER_SECRET` in Next.js `.env` |
| `INTERNAL_API_SECRET` | No | Secret for post-publish revalidation callbacks to Next.js |
| `NEXTJS_APP_URL` | No | Next.js base URL (e.g. `http://localhost:3000`) for cache revalidation |
| `S3_ENDPOINT` | Dev | MinIO URL (default: `http://localhost:9000`) |
| `S3_ACCESS_KEY_ID` | Dev | MinIO access key (default: `minioadmin`) |
| `S3_SECRET_ACCESS_KEY` | Dev | MinIO secret (default: `minioadmin`) |
| `S3_BUCKET` | Dev | MinIO bucket name (default: `flowershow`) |
| `S3_FORCE_PATH_STYLE` | Dev | Set to `true` for MinIO |
| `TYPESENSE_HOST` | No | Typesense host |
| `TYPESENSE_PORT` | No | Typesense port |
| `TYPESENSE_PROTOCOL` | No | Typesense protocol |
| `TYPESENSE_API_KEY` | No | Typesense API key (write access to all collections) |
| `POSTHOG_KEY` | No | PostHog project API key for error tracking |

### Manual file upload (smoke test)

With the worker and MinIO running, upload a file and watch it process end-to-end:

```bash
mc cp myfile.md local/flowershow/{siteId}/main/raw/myfile.md
```

MinIO fires a webhook to the worker's `/queue` endpoint, which enqueues the event. The queue consumer processes the file and writes a `Blob` record to the database. Watch the worker terminal for logs.

> **MinIO client setup:** If you haven't installed and configured `mc` yet:
> ```bash
> brew install minio/stable/mc             # macOS; see https://min.io/docs/minio/linux/reference/minio-mc.html for Linux
> mc alias set local http://localhost:9000 minioadmin minioadmin
> ```

> **Alias matters:** always use `local/flowershow/...` (the configured alias), not `minio/flowershow/...`.

## Running Tests

### Unit tests

Pure function tests — no external services required.

```bash
npm test
```

Runs `test/processing-utils.test.js`, `test/worker.test.js`, and `test/workflow-utils.test.js` via `node --test`.

### E2E tests

Spins up the actual worker via Wrangler's `unstable_dev()` API and exercises the full queue consumer → database pipeline against live Postgres and MinIO instances.

**Prerequisites:** Postgres and MinIO must be running:

```bash
# From the repo root:
docker compose up -d postgres minio
```

**Run:**

```bash
npm run test:e2e
```

Each test creates a unique `siteId`-scoped dataset and cleans up after itself, so tests are safe to run against the shared dev database.

| Suite | What it verifies |
|-------|-----------------|
| A — presigned happy path | Markdown processed → `Blob` created with `sha`/`size`/`metadata`; `Publish` finalized as `success` |
| B — `publish: false` frontmatter | File suppressed; `PublishFile` flipped to `success`; no `Blob` created |
| C — image file | PNG dimensions extracted; `Blob` created with `width`/`height` |
| D — multi-file publish | 3 files processed concurrently; atomic completion fires exactly once |
| F — anonymous upload | No `publishId` in metadata → `Blob` created; no `Publish` touched |
| G — delete event | `DeleteObject` queue event → `Blob` removed from database |

## Deployment

### Prerequisites

Create the Cloudflare queues and workflows before the first deploy (one-time, per environment):

```bash
npx wrangler queues create flowershow-markdown-queue           # production
npx wrangler queues create flowershow-markdown-queue-staging   # staging
```

Workflows are registered automatically by Wrangler on first deploy.

### Deploy

```bash
npm run deploy:staging     # staging environment
npm run deploy:production  # production environment
```

Both commands pass `--keep-vars` so secrets set via the dashboard are not overwritten.

### Required secrets (set in Cloudflare dashboard → Worker settings → Variables)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | Base64-encoded PEM private key |
| `SYNC_TRIGGER_SECRET` | Shared secret with the Next.js app |
| `INTERNAL_API_SECRET` | Revalidation callback secret |
| `NEXTJS_APP_URL` | Next.js base URL |
| `TYPESENSE_HOST` | Typesense host |
| `TYPESENSE_PORT` | Typesense port |
| `TYPESENSE_PROTOCOL` | Typesense protocol |
| `TYPESENSE_API_KEY` | Typesense API key (write access) |

R2 bucket bindings and workflow bindings are declared in `wrangler.flowershow.toml` and applied automatically on deploy.

### Queues and workflows per environment

| Environment | Queue | Workflow |
|-------------|-------|---------|
| Production | `flowershow-markdown-queue` | `flowershow-publish-workflow` |
| Staging | `flowershow-markdown-queue-staging` | `flowershow-publish-workflow-staging` |
| Dev | `markdown-processing-queue-dev` | `flowershow-publish-workflow-dev` |

## Project Structure

```
src/
  worker.js            — HTTP endpoints (/sync, /start-lifecycle, /queue dev adapter, /health),
                         queue consumer entry, cron handler, PublishWorkflow re-export
  publish-workflow.js  — Cloudflare Workflow: GitHub sync and presigned-path lifecycle ownership
  message-handler.js   — Queue consumer: file processing, Blob upsert, atomic publish completion
  workflow-utils.js    — Pure functions: diff/batch logic extracted from the Workflow (unit-testable)
  clients.js           — Factory functions for Postgres, S3/R2, and Typesense clients; env validation
  github.js            — GitHub App JWT generation, installation token fetch, tree and file APIs
  helpers.js           — ID generation, PostHog error capture
  path-utils.js        — URL slug generation, path visibility (include/exclude patterns), MIME types
  processing-utils.js  — Markdown parsing (gray-matter), title/description extraction, image dimensions
  storage.js           — R2/S3 file upload, delete, site cleanup
  typesense.js         — Typesense document upsert, deletion, collection management

test/
  processing-utils.test.js — Unit tests for markdown parsing and image processing
  worker.test.js           — Unit tests for env validation
  workflow-utils.test.js   — Unit tests for diff/batch pure functions
  e2e/
    queue-consumer.test.js — E2E tests for the full queue consumer pipeline

wrangler.flowershow.toml — Workers config: queues, workflows, crons, R2 bindings, environments
vitest.e2e.config.js     — Vitest config for E2E tests (single-fork, 30s timeout per test)
.dev.vars.example        — Template for local environment variables
```

## Metadata Extraction

The queue consumer extracts the following from markdown files:

### Title
1. `title` field in frontmatter
2. First H1 heading in the content body
3. Filename without extension as fallback

### Description
1. `description` field in frontmatter
2. First 200 characters of content body as fallback

### Other frontmatter fields
All other frontmatter key-value pairs are stored as-is in `Blob.metadata`.

To add more extraction logic, edit `parseMarkdownForSync` in [src/processing-utils.js](src/processing-utils.js).

### Suppressing files

A file with `publish: false` in its frontmatter is deleted from R2, which fires a `DeleteObject` event that removes the `Blob` and Typesense document. The `PublishFile` row is flipped to `success` since the file was intentionally suppressed.

## Known Limitations and Gotchas

- **Workflow step limit**: Cloudflare Workflows cap at ~1024 steps per instance. At the current `BATCH_SIZE` of 20 in `publish-workflow.js`, this handles up to ~20k files per GitHub sync. Do not reduce `BATCH_SIZE` without rechecking this cap.
- **File size limit**: The queue consumer rejects files larger than 5 MB.
- **Dev Workflow workaround**: `env.PUBLISH_WORKFLOW.get()` does not resolve correctly in Miniflare (local dev). In `dev` mode, the queue consumer's completion check finalizes the `Publish` record directly rather than sending a `publish-complete` event to the Workflow.
- **At-least-once delivery**: Cloudflare Queues deliver messages at least once. The atomic completion `UPDATE` and the `Blob` upsert (`INSERT ... ON CONFLICT DO UPDATE`) are both idempotent, so redelivery is safe.
- **GitHub App private keys**: GitHub generates PKCS#1 keys; Web Crypto only accepts PKCS#8. `github.js` handles the conversion at runtime — no pre-processing of the key is needed beyond base64-encoding.
