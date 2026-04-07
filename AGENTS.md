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

Don't use beads for simple tasks that can be solved during one coding session. Only use it for complex tasks and only when requested.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Clean up** - Clear stashes, prune remote branches
5. **Verify** - All changes committed
6. **Hand off** - Provide context for next session

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

## Security Review

Before finishing any task that modifies code, you MUST review your changes for security issues.

**Checklist before finishing any task that changes code:**

1. **Authentication & authorization** — Does the change touch any route, API endpoint, or action that should be protected? Verify auth checks are in place and cannot be bypassed.
2. **Input validation** — Is all user-supplied input validated and sanitized before use? Check for injection risks (SQL, command, path traversal, XSS).
3. **Secrets & credentials** — Are any secrets, tokens, or keys accidentally logged, exposed in responses, or hardcoded?
4. **Privilege escalation** — Could a user access or modify another user's data? Verify tenant/ownership checks on all data operations.
5. **Dependency on contract security** — For API routes, confirm the `security` field in the contract matches the actual auth enforcement in the route handler.
6. **Third-party data** — Is data from external sources (GitHub, webhooks, user content) treated as untrusted?

If you identify a security issue in your own changes, fix it before committing. If you find a pre-existing issue outside your change scope, file a `bd` issue with `--priority=0` (critical) or `--priority=1` (high) and note it in your hand-off.

## Documentation

Many packages and apps have their own `README.md` that documents public-facing behavior (tools, commands, configuration, etc.). When you add, remove, or change functionality, you MUST update the relevant README in the same commit or PR.

**Checklist before finishing any task that changes behavior:**

1. Search for `README.md` files in the affected package/app directory.
2. Check whether the README documents the feature you changed (e.g. a tools table, CLI commands list, config options, architecture diagram).
3. If it does, update it to reflect your changes.

This applies to any user-visible change: adding/removing tools, renaming commands, changing defaults, altering API surface, etc.
