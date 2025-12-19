# Architecture Notes

This repo implements Flowershow Cloud, a multitenant Next.js app that publishes markdown from GitHub into R2/MinIO, stores metadata in Postgres, and indexes content in Typesense. A separate Cloudflare Worker processes markdown uploads and updates Blob metadata and search indexing.

## Next.js (Vercel) responsibilities

- UI and routing via the App Router in `app/` (public site pages, dashboard, admin, settings).
- API routes in `app/api/*`:
  - GitHub webhook -> Inngest event trigger: `app/api/webhook/route.ts`.
  - Inngest handler for sync/delete workflows: `app/api/inngest/route.ts`.
  - Auth (NextAuth GitHub OAuth): `app/api/auth/[...nextauth]/route.ts`.
  - tRPC entrypoint: `app/api/trpc/[trpc]/route.ts`.
  - Stripe webhook: `app/api/stripe/webhook/route.ts`.
  - Site utilities (domain routing, sitemap, robots, raw file redirects): `app/api/domain/...`, `app/api/sitemap/...`, `app/api/robots/...`, `app/api/raw/...`.
- Server-side domain logic:
  - tRPC routers in `server/api/routers/*` (sites, stripe, user, etc).
  - Prisma client in `server/db.ts` with schema in `prisma/`.
  - Sync workflows in `inngest/functions.ts` (triggered by Inngest via the Next.js handler).
- Storage integration:
  - S3/R2/MinIO abstraction in `lib/content-store.ts`.
  - Public raw asset redirect builds R2/MinIO URLs from site+branch: `app/api/raw/[username]/[projectName]/[[...path]]/route.tsx`.

## Cloudflare Worker (external repo)

Repo: `/Users/rgrp/src/datopian/datahub-next-workers` (not part of this repo).

Purpose: process markdown uploads from R2/MinIO, parse frontmatter and body, update Blob metadata, and index content in Typesense.

Key files:
- Worker entrypoint and queue consumer: `/Users/rgrp/src/datopian/datahub-next-workers/src/worker.js`.
  - Consumes queue messages from R2 events (prod/staging) or MinIO webhook (dev at `/queue`).
  - Fetches markdown from storage, parses metadata, updates `Blob` rows, and indexes into Typesense.
  - Skips non-markdown files, ignores `_flowershow/` path, supports `publish: false` to delete content.
- Markdown parser: `/Users/rgrp/src/datopian/datahub-next-workers/src/parser.js`.
  - Extracts frontmatter + title fallback (H1 or filename).

Queues:
- Dev: `markdown-processing-queue-dev`.
- Staging: `flowershow-markdown-queue-staging`.
- Prod: `flowershow-markdown-queue`.

Storage key pattern handled by the worker:
- `{siteId}/{branch}/raw/{path}`

## Other services

- PostgreSQL (Neon/Vercel): site metadata, users, Blob records.
- R2 (Cloudflare) / MinIO (local): raw markdown and tree blobs.
- Typesense: search indexing for site content (`lib/typesense.ts` and worker).
- Inngest: background sync and delete workflows defined in `inngest/functions.ts`, invoked via `app/api/inngest/route.ts`.
- Stripe: subscription and billing (`server/api/routers/stripe.ts`, `app/api/stripe/webhook/route.ts`).
- GitHub OAuth: auth with NextAuth (`server/auth.ts`, `app/api/auth/[...nextauth]/route.ts`).

## High-level data flow

1. User authenticates and creates a site in the Next.js app.
2. Sync is triggered (manual or GitHub webhook) and sent to Inngest from `app/api/webhook/route.ts`.
3. Inngest sync function pulls files from GitHub, writes raw files to R2/MinIO, and creates/updates Blob rows in Postgres.
4. Each markdown upload to storage triggers the Cloudflare worker via queue.
5. Worker parses markdown, updates Blob metadata, and indexes in Typesense.
6. Next.js serves pages by reading metadata from Postgres and raw content from storage (via redirects).
