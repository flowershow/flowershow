# Flowershow MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that exposes Flowershow site management and publishing capabilities to AI assistants. Deployed as a stateless Next.js app at `mcp.flowershow.app`.

## Endpoint

```
POST https://mcp.flowershow.app/api/mcp
```

The server uses MCP's **Streamable HTTP** transport. Clients must send `Accept: application/json, text/event-stream` — responses are delivered as SSE events containing JSON-RPC payloads.

## Authentication

The server uses an **OAuth 2.0 Device Authorization Grant** flow — no secrets are needed in the MCP client config.

1. Call `auth_start` — returns a URL and user code
2. Open the URL in a browser and enter the code
3. Call `auth_status` to poll until authentication completes
4. All subsequent tool calls use the stored token automatically

Tokens are held in-memory per server instance. Call `auth_logout` to clear.

## Available Tools

### Auth

| Tool | Description | Parameters |
|------|-------------|------------|
| `auth_start` | Initiate device authorization flow | — |
| `auth_status` | Check/poll authentication status | — |
| `auth_logout` | Clear stored auth token | — |

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
      "url": "https://mcp.flowershow.app/api/mcp"
    }
  }
}
```

No API keys required — authenticate via the device flow after connecting.

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
pnpm test          # Run all tests (70 tests across 7 files)
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
├── app/api/[transport]/route.ts    # MCP route handler (Streamable HTTP)
├── lib/
│   ├── api-client.ts               # Typed HTTP client for Flowershow API
│   ├── config.ts                   # Environment config
│   ├── errors.ts                   # MCP-aware error helpers
│   ├── token-store.ts              # In-memory auth token storage
│   ├── types.ts                    # Domain types
│   └── tools/
│       ├── registry.ts             # Tool registration (wires all tools onto McpServer)
│       ├── auth.ts                 # Auth tool handlers
│       ├── sites.ts                # Site management tool handlers
│       └── publishing.ts           # Publishing tool handlers
```

The server is **stateless** — it acts as a thin adapter translating MCP tool calls into Flowershow REST API requests. Auth tokens are stored in-memory per server instance.

## Deployment

Deployed to Vercel as a standalone Next.js project.

**Required environment variables:**
- `FLOWERSHOW_API_URL` — Flowershow API base URL (e.g. `https://api.flowershow.app`)

**Optional:**
- `REDIS_URL` — Redis URL for MCP session persistence (falls back to in-memory)
