# ADR 0014: An MCP endpoint in the main app for publishing from chat apps

**Status**: Accepted (2026-10-02). Supersedes [ADR 0005](0005-cli-over-mcp-for-agent-integration.md) for chat apps; the CLI stays the interface for local agents.

## Context

ADR 0005 dropped the MCP server because our users' agents had shells and could run `fl`, and because the old server couldn't upload files from a cloud agent. Two things changed:

- **Chat apps can't run `fl`.** ChatGPT's code containers have no general outbound internet (only package-manager proxies). Claude's code execution defaults to "package managers only"; users can widen it, but must do so themselves, and the "All domains" setting has open bugs (Sept 2026). So people who make things in claude.ai or ChatGPT, which is most people, can't publish with the CLI and skill.
- **Remote MCP is now the in-chat path, and it works without auth.** Claude custom connectors accept authless remote MCP servers on every plan (Free: one connector). ChatGPT developer mode (Plus, Pro, Business, Enterprise, Edu) supports read and write MCP tools, and published apps reach Free users. Comparable hosts (Tiiny Host, HTML Pub, dochost, Vercel, Netlify) ship MCP; here.now explicitly doesn't. Research: `product/research/2026-10-ai-publishing-landscape.md`, `product/research/2026-10-here-now-teardown.md`. Decision bead `flowershow-56f`.
- Anonymous publishing with claim links (#1414) gives MCP a no-account flow: publish, get a live URL and a link to keep the site.

## Decision

1. **Ship a remote MCP server whose main tool is `publish`, taking file contents in the request** (text, or base64 for binary), so a cloud model can publish what it made without a filesystem. Without auth it creates an anonymous site and returns the live URL, a claim link and a claim token; calling `publish` again with `siteId` and `claimToken` replaces that site's content. With a personal access token (`Authorization: Bearer fs_pat_…`) it publishes into the account's sites by `siteId`, and `list-sites` is available. OAuth is a later step.

2. **Host it inside the main Next.js app at `/api/mcp`, not as a separate service** (the merged plan proposed reviving the Express app as its own Vercel project at `mcp.flowershow.app`):
   - **Shipping and iteration:** no new project, DNS or deploy pipeline; it ships with a normal merge.
   - **Performance:** the tool calls the sync and status route handlers in-process instead of over HTTP.
   - **Security:** the route reads only a bearer token, never session cookies, and reuses the reviewed claim-token and account-token authorisation, publish limits and expiry checks unchanged. Errors that aren't meant for users are logged, not returned to the model.
   - **Splitting later stays cheap:** the tool logic lives in `lib/mcp/` behind injected dependencies, and `mcp.flowershow.app` can be pointed at it (or at a split-out service) without changing clients beyond the URL.

3. **Stateless Streamable HTTP**: a new server and transport per request (`@modelcontextprotocol/sdk` web-standard transport), JSON responses, and `GET` answers 405, since there is no server-to-client stream to hold open on serverless.

4. **One global rate-limit bucket for MCP-created anonymous sites** (`MCP_ANON_HOURLY_LIMIT`, default 100 an hour). Chat apps call from their own cloud IPs, so the CLI's per-IP limit (10 an hour) would make every Claude or ChatGPT user share one tiny bucket. The `ANON_PUBLISH_DISABLED` kill switch covers MCP too.

5. **Per-call limits sized for chat**: 50 files and 5 MB of decoded content per `publish` call; larger sites are pointed to the CLI.

## Consequences

- Anyone can publish an anonymous site through a public endpoint without an account, at a global rate. Before announcing MCP publicly, anonymous HTML needs abuse controls (`flowershow-ctv`: sandbox or banner, abuse reports, `flowershow.me` on the Public Suffix List).
- Updates resend the whole site; there's no single-file edit tool yet.
- The model must relay the claim link; the tool result tells it to, verbatim.
- Claude custom connectors can't send a bearer header, so account publishing from claude.ai and ChatGPT needs OAuth (v2, `docs/plans/2026-02-20-mcp-oauth.md`). Account tokens work today from clients that let you set headers (Claude Code, Claude Desktop JSON config, the MCP Inspector).
