# Markdown Processing Worker

A Cloudflare worker that processes markdown files when they are uploaded to storage. The worker uses Cloudflare Queues to reliably process files and update metadata in the database.

## Features

- Automatically processes markdown (.md) and MDX (.mdx) files
- Extracts metadata from frontmatter
- Extracts `title` and `description` if not specified in the frontmatter
- Updates `Blob` records in the database with extracted metadata
- Uses queues for reliable processing with batching and retries
- Works with Cloudflare R2 storage in production/staging
- Supports MinIO for local development
- Built-in observability with sampling for monitoring
- Supports production, staging, and development environments
- Indexes content in Typesense for full-text search capabilities

## Local Development and Testing

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a local environment file and adjust it as needed.

```bash
cp .dev.vars.example .dev.vars
```

### Setting up MinIO Client

> Note: You only need to do this once.

1. Install the MinIO client (mc):

   ```bash
   # On macOS:
   brew install minio/stable/mc

   # On Linux:
   curl https://dl.min.io/client/mc/release/linux-amd64/mc \
     --create-dirs \
     -o $HOME/minio-binaries/mc
   chmod +x $HOME/minio-binaries/mc
   export PATH=$PATH:$HOME/minio-binaries/
   ```

2. Configure MinIO client alias:

```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
```

3. Create a test bucket if it doesn't exist:

```bash
mc mb local/flowershow
```

> Note: Use this bucket name in S3_BUCKET env var.

4. Test the connection:

```bash
mc ls local/flowershow
```

Important: When using MinIO client (mc), always use the configured alias (e.g., 'local') to interact with the MinIO server:

- ❌ `mc cp test.md minio/flowershow/...` - Wrong: copies to local directory
- ✅ `mc cp test.md local/flowershow/...` - Correct: uploads to MinIO server

### Setting up MinIO Event Notifications

> Note: You only need to do this once.

1. Start the worker in development mode (if not already running):

```bash
npm run dev
```

2. Configure webhook event notifications using the MinIO Client (mc):

```bash
# Add webhook configuration for markdown file events
mc admin config set local notify_webhook:worker endpoint=http://localhost:8787/queue

# Restart MinIO to apply the webhook configuration
mc admin service restart local

# Wait a few seconds for MinIO to restart, then add event configuration
mc event add local/flowershow arn:minio:sqs::worker:webhook --event put
```

This will:

- Configure a webhook endpoint at http://localhost:8787/queue (your local worker's queue endpoint)
- Set up notifications for put (creation) events
- Send events to the worker for processing

> Note: The worker must be running at http://localhost:8787 before setting up the webhook configuration, and MinIO must be restarted to apply the webhook changes.

### Setting up Typesense

For local development, you can install Typesense locally.

For installation instructions, see the [Typesense Installation Guide](https://typesense.org/docs/guide/install-typesense.html)

> Note: Before running the worker, ensure that the Typesense collection exists. The worker will attempt to index documents into this collection, so it must be created beforehand with the appropriate schema. If the collection doesn't exist, document indexing will fail.

### Manual testing with MinIO

With the worker running (`npm run dev`) and the MinIO bucket set up, you can upload a file manually to observe the full processing flow:

```bash
mc cp myfile.md local/flowershow/{siteId}/main/raw/myfile.md
```

MinIO fires a webhook to the worker's `/queue` endpoint, which enqueues the event and triggers the queue consumer. Watch the worker terminal for processing logs.

### Unit tests

Unit tests cover pure utility functions and run entirely in Node.js — no external services needed.

```bash
npm test
```

This runs `test/processing-utils.test.js`, `test/worker.test.js`, and `test/workflow-utils.test.js` via `node --test`.

### E2E tests

E2E tests spin up the actual worker via Wrangler's `unstable_dev()` API and exercise the full queue consumer → database pipeline against real Postgres and MinIO instances.

**Prerequisites:** Postgres and MinIO must be running. From the repo root:

```bash
docker compose up -d postgres minio   # starts Postgres (port 5432) + MinIO (port 9000)
```

**Run the tests:**

```bash
npm run test:e2e
```

Each test creates a unique `siteId`-scoped dataset and cleans up after itself, so tests are safe to run against the shared dev database.

**What the E2E tests cover:**

| Scenario | What it verifies |
|----------|-----------------|
| Presigned happy path | Markdown file processed → `Blob` created, `Publish` finalized as `success` |
| `publish: false` frontmatter | File suppressed, `PublishFile` still flipped to `success`, no `Blob` created |
| Image file | PNG dimensions extracted, `Blob` created with `width`/`height` |
| Multi-file publish | 3 files processed concurrently, atomic completion fires exactly once |
| Anonymous upload | No `publishId` in metadata → `Blob` created, no `Publish` record touched |
| Delete event | `DeleteObject` queue event → `Blob` removed from database |

## File Processing

The worker processes files uploaded to storage at the following path pattern:

```
/{siteId}/{branch}/raw/{pathtofile}
```

For example:

```
/my-site/main/raw/blog/welcome.md
```

The processing flow differs between environments:

### Production/Staging (R2)

1. R2 automatically queues events when files are uploaded
2. The worker processes the queued events:
   - Extracts file metadata
   - Updates the corresponding blob record in the database
   - Indexes the content in Typesense for search
3. If processing fails, the event is automatically retried

### Development (MinIO)

1. The worker receives MinIO event notifications at /queue endpoint
2. The worker queues the events for processing
3. The worker processes the queued events:
   - Extracts file metadata
   - Updates the corresponding blob record in the database
   - Indexes the content in Typesense for search
4. If processing fails, the event is automatically retried

## Queue Management

The worker uses separate queues for each environment:

- Development: `markdown-processing-queue-dev`

  - Used when running `npm run dev`
  - Handles MinIO events via /queue endpoint
  - Isolated from production events
  - Good for testing without affecting production data

- Staging: `flowershow-markdown-queue-staging`

  - Used for staging environment
  - Processes R2 events automatically
  - Allows testing with production-like setup
  - Separate from both development and production data

- Production: `flowershow-markdown-queue`
  - Used when deployed to Cloudflare
  - Processes R2 events automatically
  - Configured with appropriate retry policies

This separation ensures that development and staging testing don't interfere with production processing.

## Production Deployment

1. Create the production queue:

```bash
npx wrangler queues create flowershow-markdown-queue
```

2. Deploy the worker:

```bash
npm run deploy
```

3. Configure environment variables in Cloudflare dashboard (worker settings):

   - DATABASE_URL
   - TYPESENSE_HOST
   - TYPESENSE_PORT
   - TYPESENSE_PROTOCOL
   - TYPESENSE_API_KEY

4. The worker will automatically process events from the R2 bucket and index content in Typesense.

## Project Structure

```
src/
  worker.js            — HTTP endpoints (/sync, /start-lifecycle, /queue dev adapter, /health),
                         queue consumer entry, cron handler
  publish-workflow.js  — Cloudflare Workflow: GitHub sync and presigned-path lifecycle ownership
  message-handler.js   — Queue consumer: file processing, Blob upsert, atomic publish completion
  workflow-utils.js    — Pure functions: diff/batch logic extracted from the Workflow (unit-testable)
  clients.js           — Factory functions for Postgres, S3/R2, and Typesense clients
  github.js            — GitHub App token generation, tree fetch, file download
  helpers.js           — ID generation, PostHog error capture
  path-utils.js        — URL slug generation, path visibility (include/exclude patterns)
  processing-utils.js  — Markdown parsing (gray-matter), title extraction, image dimensions
  storage.js           — R2/S3 upload, delete, bulk delete, site cleanup
  typesense.js         — Typesense document upsert and collection management

test/
  processing-utils.test.js   — Unit tests for markdown parsing and image processing
  worker.test.js             — Unit tests for env validation
  workflow-utils.test.js     — Unit tests for diff/batch pure functions
  e2e/
    queue-consumer.test.js   — E2E tests for the full queue consumer pipeline

vitest.e2e.config.js   — Vitest config for E2E tests
wrangler.flowershow.toml — Cloudflare Workers configuration (queues, workflows, crons)
.dev.vars.example      — Example environment variables for local development
```

## Metadata Extraction

The worker extracts the following metadata from markdown files:

### Title

1. Uses frontmatter `title` field if present
2. Falls back to first H1 heading in the content
3. If no title is found, uses the filename (without extension)

### Description

1. Uses frontmatter `description` field if present
2. Falls back to extracting first 200 characters of content

To extract additional metadata, modify `parseMarkdownForSync` in `src/processing-utils.js`.

### Other frontmatter fields

Any other key-value pairs in the file's frontmatter.
