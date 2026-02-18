# Flowershow MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that exposes Flowershow site management and publishing capabilities to AI assistants. Deployed as a stateless Next.js app at `mcp.flowershow.app`.

## Endpoint

```
POST https://mcp.flowershow.app/api/mcp
```

The server uses MCP's **Streamable HTTP** transport. Clients must send `Accept: application/json, text/event-stream` — responses are delivered as SSE events containing JSON-RPC payloads.

## Authentication

The server authenticates via **Personal Access Tokens (PAT)**. Generate a token from your Flowershow account settings and pass it in the `Authorization` header of your MCP client config.

No server-side secrets or OAuth flows are needed — the token is sent with every request and validated against the Flowershow API.

## Available Tools

### User

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_user` | Get authenticated user profile | — |

### Site Management

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_sites` | List all user sites | — |
| `create_site` | Create a new site | `projectName`, `overwrite?` |
| `get_site` | Get site details | `siteId` |
| `delete_site` | Delete a site | `siteId` |
| `get_site_status` | Check processing status | `siteId` |

### Publishing

| Tool | Description | Parameters |
|------|-------------|------------|
| `publish_content` | Publish files with inline text content | `siteId`, `files[{path, content}]` |
| `sync_site` | Manifest-based sync (upload/update/delete) | `siteId`, `manifest[{path, sha, size, contentType?}]`, `dryRun?` |
| `delete_files` | Delete files by path | `siteId`, `paths[]` |

## Client Configuration

### Claude Desktop / Cursor

Add to your MCP settings:

```json
{
  "mcpServers": {
    "flowershow": {
      "type": "http",
      "url": "https://mcp.flowershow.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ${FLOWERSHOW_PAT}"
      }
    }
  }
}
```

Set the `FLOWERSHOW_PAT` environment variable to your Flowershow Personal Access Token, or replace `${FLOWERSHOW_PAT}` with the token value directly.

## Development

### Prerequisites

- Node.js 22+
- pnpm

### Setup

```bash
# From the monorepo root
cd apps/flowershow-mcp

# Install dependencies (use --ignore-workspace due to missing workspace packages)
pnpm install --ignore-workspace

# Copy env config
cp .env.example .env.local

# Start dev server
pnpm dev
```

The dev server runs on `http://localhost:3100`.

### Testing

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
```

### Type checking

```bash
npx tsc --noEmit
```

### Build

```bash
pnpm build
```

## Architecture

```
apps/flowershow-mcp/
├── app/api/[transport]/route.ts    # MCP route handler (extracts PAT from Authorization header)
├── lib/
│   ├── api-client.ts               # Typed HTTP client for Flowershow API
│   ├── config.ts                   # Environment config
│   ├── errors.ts                   # MCP-aware error helpers
│   ├── token-store.ts              # Per-request token storage
│   ├── types.ts                    # Domain types
│   └── tools/
│       ├── registry.ts             # Tool registration (wires all tools onto McpServer)
│       ├── sites.ts                # Site management tool handlers
│       └── publishing.ts           # Publishing tool handlers
```

The server is **stateless** — it acts as a thin adapter translating MCP tool calls into Flowershow REST API requests. The PAT is extracted from the `Authorization: Bearer` header on each request and set in a module-level token store for tool handlers to access via `requireAuth()`.

## Deployment

Deployed to Vercel as a standalone Next.js project.

**Required environment variables:**
- `FLOWERSHOW_API_URL` — Flowershow API base URL (e.g. `https://api.flowershow.app`)

**Optional:**
- `REDIS_URL` — Redis URL for MCP session persistence (falls back to in-memory)
