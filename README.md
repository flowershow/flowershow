# Flowershow

> The fast and simple way to turn markdown into a website

[See Flowershow in action on flowershow.app](https://flowershow.app/)

## Monorepo Structure

This is a [Turborepo](https://turbo.build/) monorepo managed with [pnpm](https://pnpm.io/) workspaces.

```
apps/
  flowershow/           # Next.js web application (flowershow.app)
packages/
  cloudflare-worker/    # Markdown processing Cloudflare worker
  remark-wiki-link/     # @flowershow/remark-wiki-link — remark plugin for wiki-style links
content/
  flowershow-app/       # Marketing site content (Obsidian vault, not a workspace package)
```

## Quick Start

**Prerequisites:** [Node.js 22+](https://nodejs.org/), [pnpm](https://pnpm.io/installation), and [Docker](https://docs.docker.com/get-docker/).

```bash
# Clone (include the e2e test-site submodule)
git clone --recurse-submodules https://github.com/flowershow/flowershow.git
cd flowershow

# Install dependencies
pnpm install

# Copy env template (then edit apps/flowershow/.env with your secrets)
cp apps/flowershow/.env.example apps/flowershow/.env

# Start everything: Postgres, MinIO, Inngest, Cloudflare Worker, Next.js app
pnpm dev:up
```

Visit `http://cloud.localhost:3000` once it's running.

> If you already cloned without `--recurse-submodules`, run
> `git submodule update --init` to fetch the e2e test site.

### Commands

```bash
pnpm dev:up --stripe           # Also start Stripe webhook forwarding
pnpm dev:up --github           # Also start Smee (GitHub webhook proxy)
pnpm dev:up --search           # Also start Typesense
pnpm dev:up:all                # Start everything including all optional services

pnpm dev                       # Start dev servers only (no Docker infrastructure)
pnpm dev:down                  # Stop Docker containers (keep data)
pnpm dev:nuke                  # Stop containers + delete all data volumes

pnpm build                     # Build all packages
pnpm test                      # Run tests across all packages
pnpm lint                      # Lint all packages (ESLint for app, Biome for packages)
pnpm format                    # Check formatting (Biome)
pnpm format:write              # Auto-fix formatting
```

For web app setup (database, storage, auth, etc.), see [`apps/flowershow/README.md`](apps/flowershow/README.md).

## Tooling

| Tool | Scope | Purpose |
|------|-------|---------|
| [Biome](https://biomejs.dev/) | Entire repo | Formatting (single quotes, 2-space indent) and linting for `packages/` |
| [ESLint](https://eslint.org/) | `apps/flowershow` | Next.js-specific linting via `eslint-config-next` |
| [Vitest](https://vitest.dev/) | `packages/remark-wiki-link` | Unit tests |
| [Playwright](https://playwright.dev/) | `apps/flowershow` | E2E tests |
| [Turborepo](https://turbo.build/) | Root | Task orchestration and caching |
| [Changesets](https://github.com/changesets/changesets) | `packages/` | Versioning and npm publishing |
| [Husky](https://typicode.github.io/husky/) | Root | Git hooks (pre-commit runs lint-staged) |

A pre-commit hook automatically formats staged files via lint-staged before each commit.

### Releasing packages

```bash
pnpm changeset                 # Create a changeset describing your change
pnpm version-packages          # Bump versions based on changesets
pnpm release                   # Build all packages and publish to npm
```

## Documentation

- **Web app**: [`apps/flowershow/README.md`](apps/flowershow/README.md) — architecture, local dev setup, environment config, testing, troubleshooting
- **REST API**: [`packages/api-contract`](packages/api-contract) — Zod-based OpenAPI 3.1 spec
- **User docs**: [flowershow.app/docs](https://flowershow.app/docs)

## Community

- Browse [existing issues](https://github.com/flowershow/flowershow/issues) or [submit a new one](https://github.com/flowershow/flowershow/issues/new)
- Visit our [discussions](https://github.com/flowershow/flowershow/discussions) to ask questions, share ideas, or showcase your Flowershow site

## Contributing

We're working on opening up parts of Flowershow for community contributions. While this isn't ready yet, we're excited to welcome contributors soon.

You can already contribute by adding pull requests for demos or tests of Flowershow markdown features:

- **Demo**: [demo.flowershow.app](https://demo.flowershow.app) — [github.com/flowershow/demo](https://github.com/flowershow/demo)
- **Test**: [test.flowershow.app](https://test.flowershow.app/) — [github.com/flowershow/test](https://github.com/flowershow/test)

### Development Workflow

1. Create feature branch from `staging`
2. Implement changes
3. Submit PR to `staging`
4. After approval, changes are merged to `main`

We use squash merges to `staging` with conventional commit messages.
