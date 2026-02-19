# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Starting Implementation Work

When a user asks to implement something, always check for an existing related `bd` issue first.

1. Run `bd ready` and look for the most relevant item.
2. If you find a match, review it with `bd show <id>` and claim it with `bd update <id> --status in_progress` before coding.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## REST API and api-contract

The Flowershow REST API has a **contract-first** workflow. The contract package (`packages/api-contract/`) is the single source of truth for the API surface. Read [`packages/api-contract/README.md`](packages/api-contract/README.md) for full details.

### When changing an API route in `apps/flowershow/app/api/`

1. **Update the contract first** (or at the same time as the route). Never change route behavior without updating the contract.
2. **Schemas go in `packages/api-contract/src/schemas.ts`** — define Zod schemas and export the inferred TypeScript types.
3. **Route registrations go in `packages/api-contract/src/routes/*.ts`** — register the method, path, operationId, tags, security, request/response schemas.
4. **Wire new route files** into `openapi.ts` if you add a new `routes/*.ts` file.
5. **Build the contract** after changes: `pnpm turbo build --filter=@flowershow/api-contract`
6. **In the API route**, import schemas for request validation (`.safeParse()`) and types for response typing (`satisfies` / `: Type`).

### Contract conventions

- **Request validation**: Use `schema.safeParse(body)` on incoming request data. Return 400 with `{ error: 'bad_request', error_description: parsed.error.message }` on failure.
- **Response typing**: Annotate response objects with `satisfies SomeType` or `: SomeType` so TypeScript catches drift.
- **Security**: Routes requiring auth use `[{ bearerToken: [] }]` (CLI/PAT) or `[{ sessionCookie: [] }]` (browser). Some accept both.
- **Tags**: Match the existing tags in `openapi.ts` — `CLI Auth`, `User`, `Sites`, `Anonymous Publishing`, `Site Access`, `GitHub App`, `Webhooks`, `Domain`, `SEO`.
- **operationId**: Every route gets a unique camelCase operationId (e.g. `createSite`, `listSites`).

### What NOT to do

- Do NOT write OpenAPI YAML/JSON by hand. The spec is generated from Zod schemas.
- Do NOT define local TypeScript interfaces for request/response shapes in API routes — import them from the contract.
- Do NOT add routes to the Next.js app without a corresponding contract entry (unless it is pure infrastructure like tRPC, NextAuth, or Inngest handlers).

### Verifying changes

After modifying the contract or API routes:

```bash
pnpm turbo build --filter=@flowershow/api-contract
# Then check the Swagger UI to verify the spec looks correct:
# http://cloud.flowershow.local:3000/api/docs
```
