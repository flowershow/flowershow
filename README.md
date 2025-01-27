# DataHub Cloud

DataHub Cloud is a NextJS multitenant application designed for seamlessly publishing markdown content from GitHub repositories. It enables users to create and manage their own sites with content synced directly from GitHub repositories.

## Project Overview

The application provides:

- Multi-tenant architecture supporting multiple users and sites
- Built-in authentication via GitHub
- Markdown content publishing from GitHub repositories
- Custom domain support
- Automatic content synchronization

## Architecture

The application is built with:

- **Frontend**: Next.js with TypeScript
- **Database**: PostgreSQL for user accounts and site metadata
- **Storage**: R2 Cloudflare buckets for content storage
- **Authentication**: NextAuth with GitHub OAuth
- **Deployment**: Vercel
- **Background Jobs**: Inngest

## Environment Setup

### Local Development Setup

1. Clone the [repository](https://github.com/datopian/datahub-next)
2. Create a `.env` file from `.env.example`
3. Set up local PostgreSQL database
4. Configure database variables in `.env`
5. Set up MinIO for local storage:

   ```bash
   # Install MinIO on MacOS
   brew install minio/stable/minio

   # Start MinIO server
   minio server ~/minio
   ```

6. Configure MinIO bucket:

   - Open MinIO Console at http://localhost:9000
   - Login with default credentials (minioadmin/minioadmin)
   - Click "Buckets" → "Create Bucket"
   - Create bucket named "datahub"
   - Set bucket Access Policy to "public"

7. Run `pnpm fetch-config` or create your own `config.json` file
8. Install pnpm: `npm install -g pnpm`
9. Install dependencies: `pnpm i`
10. Generate Prisma schema: `npx prisma generate`
11. Create database schema: `npx prisma db push`
12. Start development server: `pnpm dev`
13. Start local Inngest instance:
    ```bash
    npx inngest-cli@latest dev --no-discovery -u http://localhost:3000/api/inngest
    ```
14. Visit app at `http://cloud.localhost:3000`

## Environment Configuration

### Environment Variables

- Create `.env` file based on `.env.example`
- All environment variables must be defined in `env.mjs`
- Access variables using `import { env } from './env.mjs'`

### App Configuration

The application is configurable via `config.json` file (path set via `APP_CONFIG_URL`). Configuration options include:

- Title
- Description
- Favicon URL
- Logo URL
- Thumbnail URL
- Navigation links
- Social links
- Site aliases

Current config file: [DataHub Cloud config.json](https://dash.cloudflare.com/83025b28472d6aa2bf5ae59f3724aa78/r2/default/buckets/datahub-assets/objects/config.json/details)

## Infrastructure

### Databases

PostgreSQL databases on Vercel:

- Production: `datahub-cloud`
- Staging: `datahub-cloud-staging`
- Development: Local PostgreSQL instance

### Content Storage

R2 Cloudflare buckets:

- Production: `datahub-cloud`
- Staging: `datahub-cloud-staging`
- Development: Local MinIO instance

### Authentication

GitHub OAuth applications under Datopian account:

- Production: `DataHub Cloud`
- Staging: `DataHub Cloud - Staging`
- Development: `DataHub Cloud - Dev`

### Domain Configuration

#### Root Domain (datahub.io)

Two projects share the datahub.io domain:

1. DataHub Cloud app (`@username/projectname` paths)
2. DataHub.io website (landing pages)

Traffic routing managed by Cloudflare worker:

- Landing pages (`/`, `/publish`, `/pricing`, `/collections`) → datahub-io project
- All other paths → datahub-next-new project

Worker: [datahub-io-reverse-proxy](https://dash.cloudflare.com/83025b28472d6aa2bf5ae59f3724aa78/workers/services/view/datahub-io-reverse-proxy)

#### Subdomains

- Production: `cloud.datahub.io`
- Staging: `staging-cloud.datahub.io`

## Development

### Branching Strategy

Two main branches:

- `main` (production)
  - Protected branch
  - No direct pushes
  - Changes merged via staging
- `staging`
  - Testing environment
  - Accepts pull requests

### Development Workflow

1. Create feature branch from `staging`
2. Implement changes
3. Submit PR to `staging`
4. After approval, changes are merged to `main`

### Commit Strategy

We use a squash-based system:

1. Developers work freely on feature branches
2. PRs are squash-merged to `staging`
3. Commit messages follow conventional commits specification
4. Changes are rebased from staging to main

## Testing

### Prerequisites

Access to https://github.com/datopian/datahub-cloud-test-repo

### Running Tests

Start the application:

```bash
pnpm dev
```

Run tests:

```bash
npx playwright test
```

Debug modes:

```bash
# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

## Content Management

### Special Pages

DataHub Cloud manages several aliased pages:

#### Core Datasets

- Path: `/core/xxx`
- Alias for: `/@olayway/xxx`
- Source: https://github.com/datasets
- Auto-sync enabled

#### Blog

- Path: `/blog`
- Alias for: `@olayway/blog`
- Source: https://github.com/datahubio/blog
- Auto-sync enabled

#### Collections

- Path: `/collections/*`
- Alias for: `@olayway/collections/*`
- Source: https://github.com/datasets/awesome-data
- Auto-sync enabled

#### Documentation

- Path: `/docs`
- Alias for: `@olayway/docs`
- Source: https://github.com/datahubio/datahub-cloud-template
- Auto-sync enabled

#### Notes

- Path: `/notes`
- Alias for: `@rufuspollock/data-notes`
- Auto-sync enabled

#### Logistics

- Path: `/logistics/postal-codes-*`
- Alias for: `@olayway/postal-codes-*`
- Source: https://github.com/datopian/postal-codes
- Manual sync required via admin page

### Site Aliases

- Configured via `siteAliases` in `config.json`
- Used to provide clean URLs for official content
- Enables consistent branding across different content sources

## Troubleshooting

### Common Issues

1. MinIO Connection Issues

   - Verify MinIO is running
   - Check credentials in `.env`
   - Ensure bucket is publicly accessible

2. Database Connection

   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure schema is up to date

3. OAuth Authentication
   - Verify correct OAuth app configuration
   - Check callback URLs
   - Ensure environment variables are set

For additional support, please create an issue in the GitHub repository.
