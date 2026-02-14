# Flowershow

> The fast and simple way to turn markdown into a website

[See Flowershow in action on flowershow.app](https://flowershow.app/)

## Monorepo Structure

This is a [Turborepo](https://turbo.build/) monorepo managed with [pnpm](https://pnpm.io/) workspaces.

```
apps/
  flowershow/             # Next.js web application (flowershow.app)
packages/
  cli/                  # @flowershow/publish — CLI for publishing sites
  cloudflare-worker/    # Markdown processing Cloudflare worker
  obsidian-plugin/      # Obsidian plugin for Flowershow
  remark-wiki-link/     # @flowershow/remark-wiki-link — remark plugin for wiki-style links
  themes/               # CSS themes
content/
  flowershow-app/       # Marketing site content (Obsidian vault)
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start the web app in development mode
pnpm dev

# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint
```

For web app setup (database, storage, auth, etc.), see [`apps/flowershow/README.md`](apps/flowershow/README.md).

## Documentation

- **Web app**: [`apps/flowershow/README.md`](apps/flowershow/README.md) — architecture, local dev setup, environment config, testing, troubleshooting
- **REST API**: [`apps/flowershow/docs/openapi.yaml`](apps/flowershow/docs/openapi.yaml) — OpenAPI 3.1 spec
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
