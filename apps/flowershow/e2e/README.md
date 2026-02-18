# E2E Tests

End-to-end tests using [Playwright](https://playwright.dev/) against a running local dev server.

## Prerequisites

- Local dev server running (`pnpm dev`)
- Database and MinIO running (via Docker Compose)

## Running tests

```bash
# Full run: seed DB → run tests (both projects) → teardown
pnpm test:e2e

# Run a single spec file (with seed)
npx playwright test frontmatter

# Run a single spec file (without seed)
npx playwright test --project=chromium --no-deps frontmatter

# Run links-and-embeds against the free site only
npx playwright test --project=chromium --no-deps links-and-embeds

# Run links-and-embeds against the premium custom-domain site only
npx playwright test --project=custom-domain --no-deps links-and-embeds

# Run setup only (seed data — seeds both free and premium sites)
npx playwright test --project=setup

# Run teardown only (clean up seeded data)
npx playwright test --project=teardown
```

## Project structure

```
e2e/
├── fixtures/        # Markdown/MDX content seeded into DB + MinIO
├── helpers/
│   └── seed.ts      # Seed/teardown logic, shared constants (BASE_PATH)
├── specs/           # Test files
├── setup.ts         # Playwright setup project (runs seed)
└── teardown.ts      # Playwright teardown project (runs cleanup)
```

## How setup works

The Playwright config defines four projects:

1. **setup** — seeds both the free site and the premium custom-domain site
2. **chromium** — runs all specs against the free site (`/@test-user/e2e-test-site`)
3. **custom-domain** — runs `links-and-embeds.spec.ts` against the premium site (`e2e-premium.flowershow.local:3000`), where links resolve without a path prefix
4. **teardown** — deletes seeded data (depends on both chromium and custom-domain)

Using `--project=chromium --no-deps` (or `pnpm test:e2e:quick`) skips the setup and teardown projects, running only the browser tests against whatever data is already in the DB.

## Shared constants

Most spec files import `BASE_PATH` from `./helpers/seed.ts`:

```ts
import { BASE_PATH } from "../helpers/seed";
// BASE_PATH = /@test-user/e2e-test-site
```

`links-and-embeds.spec.ts` instead imports `test` from `./helpers/fixtures.ts`, which exposes a `basePath` fixture option. This lets the same spec run under both the `chromium` project (where `basePath = '/@test-user/e2e-test-site'`) and the `custom-domain` project (where `basePath = ''`).
