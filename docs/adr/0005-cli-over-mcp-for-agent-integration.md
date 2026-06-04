# CLI over MCP server for AI agent integration

The Flowershow MCP server (`apps/flowershow-mcp`) was removed in favour of extending the CLI (`apps/cli`) as the primary interface for AI agent integration. The MCP server only has value when agents run in cloud-hosted environments with no local shell access (e.g. Claude.ai). Our target users run local AI tools (Claude Code, Cursor, Windsurf) that have shell access and can invoke `fl` directly. The CLI already handles bulk publishing, delta sync, and file discovery — operations the MCP server cannot do end-to-end without access to the local filesystem. Maintaining a parallel API surface that duplicates CLI functionality for a user that does not exist yet is not worth the cost.

## Considered Options

**MCP server** — dropped because `publish-local-files` returns presigned URLs but cannot read or upload files itself, making bulk publishing impossible from a cloud agent context. For local agents it adds nothing the CLI cannot already do.

**CLI as agent interface** — chosen. Agents invoke `fl` shell commands directly.

## Discovery

Agents need to know the CLI exists. We use the [skills](https://www.npmjs.com/package/skills) open agent skills ecosystem: a single `SKILL.md` in the monorepo is the canonical source of instructions, and users install it with `npx skills add flowershow/skills --global`. This handles writing to the correct config file for each agent tool (Claude Code, Cursor, Windsurf, and 67+ others) without Flowershow maintaining per-tool logic.

The CLI was rewritten from Node.js to Go specifically so Windows users don't need Node.js. `npx skills add` reintroduces that dependency, so the README documents both paths: the `npx` command for users who have Node.js, and a copy-paste snippet of the `SKILL.md` content for everyone else.

Auto-adding the snippet via the installer was considered but deferred — a future `fl setup-agents` command in the Go binary would be the right cross-platform solution.

## Auth

`fl login` (OAuth device flow) is sufficient for agent-assisted use. The agent runs `fl login`, captures the URL and code from stdout, and presents it to the user in chat — the user never needs to touch a terminal. A PAT environment variable (`FLOWERSHOW_PAT`) was considered for headless/CI use but is not required for the current non-technical user target.

## CLI gaps

`fl settings get` and `fl settings set` are the remaining capability gaps relative to the MCP server. `fl settings get` can be added immediately (the `GET /api/sites/id/{siteId}` endpoint already exists). `fl settings set` requires a new `PATCH /api/sites/id/{siteId}` API endpoint (contract-first per AGENTS.md) and is lower priority.

## Consequences

If cloud-hosted agent support (scenario B) becomes a real target, the MCP server should be revived. The `apps/flowershow-mcp` directory was deleted; the git history preserves the implementation.
