# E2E Tests

End-to-end tests using [Playwright](https://playwright.dev/) against a running local dev server.

## Prerequisites

- Local dev server running (`pnpm dev`)
- Database and MinIO running (via Docker Compose)
- The app must run with `SOCIAL_CARDS_ENABLED=true` for `social-preview.spec.ts` (generated social cards are off by default)
- `/etc/hosts` entries for the custom-domain sites so they resolve locally:

  ```
  127.0.0.1 e2e-premium.flowershow.local
  127.0.0.1 e2e-password-premium.flowershow.local
  ```

  These hosts must **not** be subdomains of `NEXT_PUBLIC_SITE_DOMAIN` (`localhost:3000`),
  or the middleware routes them through the subdomain branch and the custom-domain
  tests 404. Override them with `E2E_CUSTOM_DOMAIN` /
  `E2E_PASSWORD_CUSTOM_DOMAIN` if needed.

## Running tests

```bash
# Full run: seed DB → run tests (all browser projects) → teardown
pnpm test:e2e

# Run a single spec file (with seed)
npx playwright test frontmatter

# Run a single spec file (without seed)
npx playwright test --project=chromium --no-deps frontmatter

# Run links-and-embeds against the free site only
npx playwright test --project=chromium --no-deps links-and-embeds

# Run links-and-embeds against the premium custom-domain site only
npx playwright test --project=custom-domain --no-deps links-and-embeds

# Run the list block / layout: list specs against the listings demo site only
npx playwright test --project=listings --no-deps listings

# Capture listing screenshots into test-results/listing-screenshots/ (skipped unless set)
LISTING_SCREENSHOTS=1 npx playwright test --project=listings --no-deps listings-screenshots

# Run setup only (seed data — seeds free, premium, password-protected and listings sites)
npx playwright test --project=setup

# Run teardown only (clean up seeded data)
npx playwright test --project=teardown
```

## Project structure

```
e2e/
├── fixtures/        # Markdown/MDX content seeded into DB + MinIO
│   ├── test-site/      # free, premium and password sites
│   └── listings-demo/  # listings site (list blocks, layout: list, zero-config blog/posts)
├── helpers/
│   └── seed.ts      # Seed/teardown logic, shared base-URL constants
├── specs/           # Test files
├── setup.ts         # Playwright setup project (runs seed)
└── teardown.ts      # Playwright teardown project (runs cleanup)
```

## How setup works

The Playwright config defines seven projects:

1. **setup** — seeds the free site, the premium custom-domain site, the password-protected site, the password-protected custom-domain site, and the listings demo site
2. **chromium** — runs every spec (except the `password-protection*` and `listings*` specs) against the free subdomain site (`e2e-test-site-test-user.localhost:3000`)
3. **custom-domain** — runs `links-and-embeds.spec.ts` and `rss.spec.ts` against the premium site (`e2e-premium.flowershow.local:3000`), which is served as a real custom domain
4. **password-protection** — runs `password-protection.spec.ts` against the password-protected site (`e2e-password-site-test-user.localhost:3000`)
5. **password-custom-domain** — runs `password-protection-custom-domain.spec.ts` against the password-protected custom-domain site (`e2e-password-premium.flowershow.local:3000`); regression coverage for the login redirect loop fixed in `04b2128c`
6. **listings** — runs `listings*.spec.ts` against the listings demo site (`e2e-listings-test-user.localhost:3000`), seeded from `fixtures/listings-demo/` with worker-encoded app paths (spaces and non-ASCII). `listings-screenshots.spec.ts` skips itself unless `LISTING_SCREENSHOTS` is set; CI captures it only on a manual `workflow_dispatch` run with `listing_screenshots: true` and uploads the `listing-screenshots` artifact. Check fixture changes locally first with `pnpm preview:listings:demo` (no database: renders every fixture URL through the real listing code)
7. **teardown** — deletes seeded data (depends on chromium, custom-domain, password-protection, password-custom-domain, and listings)

Using `--project=chromium --no-deps` skips the setup and teardown projects, running only the browser tests against whatever data is already in the DB.

## Shared constants

Since the subdomain migration, every site is reached at its own host, so specs
target paths directly (no `/@user/project` prefix). The base URL for each project
is set in `playwright.config.ts` from constants in `./helpers/seed.ts`:

```ts
import {
  FREE_SITE_BASE_URL,        // http://e2e-test-site-test-user.localhost:3000
  PREMIUM_SITE_CUSTOM_DOMAIN, // e2e-premium.flowershow.local:3000
  PASSWORD_SITE_BASE_URL,     // http://e2e-password-site-test-user.localhost:3000
  LISTINGS_SITE_BASE_URL,     // http://e2e-listings-test-user.localhost:3000
} from "../helpers/seed";
```

`links-and-embeds.spec.ts` and `rss.spec.ts` import `test` from `./helpers/fixtures.ts`,
which exposes a `basePath` fixture option (defaulting to `''`). It exists so those
specs can prefix paths if a project ever needs it; all projects currently set
`basePath = ''`, so paths are used as-is.
