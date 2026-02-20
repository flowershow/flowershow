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

### Testing with MinIO

You can test the worker by uploading files.

Make sure the worker is running and upload the test file:

```bash
# Upload a markdown file
mc cp test/test.md local/flowershow/test-site/main/raw/test.md
```

The worker will:

1. Receive the MinIO event at /queue endpoint
2. Queue the file for processing
3. Process the queued event
4. Update the blob metadata in the database

You can monitor the worker logs in the development terminal to track processing status and any errors.

Note: Ensure your database has a blob record for the test file path before testing.

### Running E2E Tests

The project includes end-to-end tests that verify the complete flow from file upload to database updates. The tests are self-sufficient and will automatically set up all required dependencies. To run the tests:

1. Clone the test dependencies:

   ```bash
   git submodule update --init
   ```

2. Run the tests:
   ```bash
   npm test
   ```

The tests will:

1. Start MinIO and PostgreSQL using Docker Compose
2. Initialize the database schema
3. Set up test data:
   - Create a test site in the database
   - Create a blob record for the test file
4. Upload test/test.md to MinIO
5. Start the worker locally
6. Verify that the file is processed and metadata is correctly updated:
   - Title from frontmatter
   - Description from frontmatter
   - Additional metadata like date
7. Clean up all test data and stop Docker services when done

Requirements:

- Docker and Docker Compose
- MinIO client (mc)
- Node.js and npm

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

- `src/worker.js` - Main worker file that handles storage events and queue processing
- `src/parser.js` - Markdown parsing and metadata extraction
- `test/test.md` - Sample markdown file for testing
- `test/e2e.bats` - End-to-end tests
- `wrangler.flowershow.toml` - Cloudflare Workers configuration
- `.dev.vars.example` - Example environment variables
- `.github/workflows/test.yml` - GitHub Actions workflow configuration

## Metadata Extraction

The worker extracts the following metadata from markdown files:

### Title

1. Uses frontmatter `title` field if present
2. Falls back to first H1 heading in the content
3. If no title is found, uses the filename (without extension)

### Description

1. Uses frontmatter `description` field if present
2. Falls back to extracting first 200 characters of content

To extract additional metadata, modify the `parseMarkdownFile` function in `src/parser.js`.

### Other frontmatter fields

Any other key-value pairs in the file's frontmatter.
