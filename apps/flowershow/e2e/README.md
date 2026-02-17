# E2E Tests

End-to-end tests using [Playwright](https://playwright.dev/) against a running local dev server.

## Prerequisites

- Local dev server running (`pnpm dev`)
- Database and MinIO running (via Docker Compose)

## Running tests

```bash
# Full run: seed DB → run tests → teardown
pnpm test:e2e

# Run a single spec file (with seed)
npx playwright test frontmatter

# Run a single spec file (without seed)
npx playwright test --project=chromium --no-deps frontmatter

# Run setup only (seed data)
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

The Playwright config defines three projects:

1. **setup** — seeds the database and MinIO with fixture content
2. **chromium** — runs the actual specs (depends on setup)
3. **teardown** — deletes seeded data

Using `--project=chromium --no-deps` (or `pnpm test:e2e:quick`) skips the setup and teardown projects, running only the browser tests against whatever data is already in the DB.

## Shared constants

All spec files import `BASE_PATH` from `./helpers/seed.ts` instead of defining their own. This ensures the test username and project name always match what was seeded:

```ts
import { BASE_PATH } from "../helpers/seed";
// BASE_PATH = /@test-user/e2e-test-site
```
