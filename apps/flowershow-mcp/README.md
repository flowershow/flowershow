# Flowershow MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes Flowershow site management tools to AI assistants like Claude, ChatGPT, and others.

## Tools

| Tool           | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| `list-sites`   | List all your Flowershow sites                                     |
| `get-site`     | Get details for a specific site (plan, privacy, file count, etc.)  |
| `get-user`     | Get current user profile                                           |
| `create-site`  | Create a new site                                                  |
| `delete-site`  | Delete a site and all its content                                  |
| `publish-note` | Publish in-memory markdown as a note to an existing site           |
| `publish-local-files` | Request presigned upload URLs for metadata-only file lists (max 100 per call) |
| `get-publish-status` | Poll current publishing status for a site                    |

### Typical AI workflow

The AI agent is expected to compose tools. For example, to publish a note:

1. Call `list-sites` to find the target site and its ID
2. Call `publish-note` with `siteId`, `path`, and `content`

The `publish-note` tool uploads the content and polls until the note is live, then returns the live URL.

For larger publishing jobs (for example a whole vault) in remote HTTP deployments:

1. Client scans local files and computes `{ path, size, sha }`
2. Call `publish-local-files` with `siteId` + `files` metadata (max 100 files)
3. Client uploads each local file bytes directly to returned presigned `uploadUrl`
4. Call `get-publish-status` until status becomes `complete`

This keeps local filesystem access on the client machine and works with deployed MCP servers.

## Prerequisites

1. A Flowershow account at [flowershow.app](https://flowershow.app)
2. A Personal Access Token (PAT) — create one at [flowershow.app/dashboard/tokens](https://flowershow.app/dashboard/tokens)
3. Node.js >= 20

## Quick Start (local)

```bash
# From the monorepo root
pnpm install
pnpm build --filter @flowershow/mcp

# Start the server
pnpm run --filter @flowershow/mcp start
```

The server listens on `http://localhost:3456/mcp` by default.

## Client Configuration

Add the server to your MCP client config. Your PAT is passed via the `Authorization` header.

### Claude Desktop / Claude Code

In `~/.claude/settings.json` (or project-level `.claude/settings.json`):

```json
{
  "mcpServers": {
    "flowershow": {
      "type": "remote",
      "url": "http://localhost:3456/mcp",
      "headers": {
        "Authorization": "Bearer fs_pat_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### ChatGPT

In the MCP server settings, add:

- **URL**: `http://localhost:3456/mcp`
- **Headers**: `Authorization: Bearer fs_pat_YOUR_TOKEN_HERE`

### OpenCode

In `opencode.json`:

```json
{
  "mcp": {
    "flowershow": {
      "type": "remote",
      "url": "http://localhost:3456/mcp",
      "headers": {
        "Authorization": "Bearer fs_pat_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

## Testing Locally

### With curl

```bash
# Start the server
pnpm run --filter @flowershow/mcp start

# In another terminal — test auth error (no token)
curl -s -X POST http://localhost:3456/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'

# Test with a real PAT (should return server capabilities)
curl -s -X POST http://localhost:3456/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Authorization: Bearer fs_pat_YOUR_TOKEN_HERE' \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
```

### With MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Then connect to `http://localhost:3456/mcp` and add the `Authorization` header in the inspector UI.

## Environment Variables

| Variable             | Default                  | Description                                                                        |
| -------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `PORT`               | `3456`                   | HTTP port to listen on                                                             |
| `FLOWERSHOW_API_URL` | `https://flowershow.app/api` | Flowershow API base URL (useful for local dev against a local Flowershow instance) |

## Architecture

- **Transport**: Stateless [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) — each request creates a fresh MCP server instance, no session state
- **Auth**: PAT forwarded from client request `Authorization` header to the Flowershow REST API
- **SDK**: `@modelcontextprotocol/sdk` v1.x (stable)
- **Runtime**: Express via `createMcpExpressApp()` (includes DNS rebinding protection)
- **Contract**: `GET /mcp/contract` exposes a machine-readable JSON Schema contract generated from the same Zod tool input schemas used by the server

```
MCP Client (Claude, ChatGPT, etc.)
    │
    │  POST /mcp  +  Authorization: Bearer fs_pat_...
    ▼
┌─────────────────────┐
│  Flowershow MCP     │
│  Server (Express)   │
│                     │
│  extractPat(req) ───┼──► per-request FlowershowApi
│  createServer(api)  │        │
│  StreamableHTTP     │        │  GET /api/sites
│  Transport          │        │  Authorization: Bearer fs_pat_...
└─────────────────────┘        ▼
                        ┌─────────────┐
                        │ Flowershow  │
                        │ REST API    │
                        └─────────────┘
```

## Development

```bash
# Dev mode with auto-reload
pnpm dev --filter @flowershow/mcp

# Build
pnpm build --filter @flowershow/mcp

# Format (from monorepo root)
pnpm format:write
```

## Deployment

The server is a standard Node.js HTTP server. Deploy it anywhere that runs Node.js:

### Vercel / Netlify / Fly.io

Set the `PORT` environment variable as required by your platform (most set it automatically).

### Docker

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY apps/flowershow-mcp/dist ./dist
COPY apps/flowershow-mcp/package.json .
RUN npm install --omit=dev
EXPOSE 3456
CMD ["node", "dist/local-dev.js"]
```

### Standalone

```bash
pnpm build --filter @flowershow/mcp
node apps/flowershow-mcp/dist/local-dev.js
```
