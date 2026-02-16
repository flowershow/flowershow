import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock config before any imports that use it
vi.mock('../config', () => ({
  getConfig: () => ({ apiUrl: 'https://api.flowershow.app', port: '3100' }),
}));

// Mock fetch globally for API client calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/**
 * Parse an SSE response body to extract JSON-RPC message(s).
 * mcp-handler responds with `Content-Type: text/event-stream` using the
 * format: `event: message\ndata: {json}\n\n`
 */
function parseSseResponse(text: string): unknown {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      return JSON.parse(line.slice(6));
    }
  }
  throw new Error(`No data line found in SSE response: ${text}`);
}

describe('MCP Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset token store between tests
    vi.resetModules();
  });

  /**
   * Helper to build a JSON-RPC request body for the MCP streamable HTTP
   * transport. The handler expects a standard `Request` object.
   * mcp-handler requires Accept to include both application/json and
   * text/event-stream, and always responds with SSE format.
   */
  function mcpRequest(
    method: string,
    params: Record<string, unknown> = {},
    id: number | string = 1,
  ): Request {
    return new Request('http://localhost:3100/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }),
    });
  }

  /**
   * Send an MCP request and parse the SSE response body into a JSON-RPC
   * result object. Asserts a 200 status.
   */
  async function mcpCall(
    handler: (req: Request) => Promise<Response>,
    method: string,
    params: Record<string, unknown> = {},
    id: number | string = 1,
  ): Promise<Record<string, unknown>> {
    const req = mcpRequest(method, params, id);
    const res = await handler(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    return parseSseResponse(text) as Record<string, unknown>;
  }

  async function getHandler() {
    const { createMcpHandler } = await import('mcp-handler');
    const { registerTools } = await import('../tools/registry');

    return createMcpHandler(
      (server) => {
        registerTools(server);
      },
      {
        serverInfo: {
          name: 'Flowershow MCP',
          version: '0.1.0',
        },
        capabilities: {
          tools: {},
        },
      },
      {
        basePath: '/api',
      },
    );
  }

  test('tools/list returns all 12 registered tools', async () => {
    const handler = await getHandler();
    const body = await mcpCall(handler, 'tools/list') as { result?: { tools?: { name: string }[] } };
    expect(body.result).toBeDefined();
    expect(body.result!.tools).toBeDefined();
    expect(body.result!.tools).toHaveLength(12);

    const toolNames = body.result!.tools!.map((t) => t.name);
    expect(toolNames).toContain('auth_start');
    expect(toolNames).toContain('auth_status');
    expect(toolNames).toContain('auth_logout');
    expect(toolNames).toContain('get_user');
    expect(toolNames).toContain('list_sites');
    expect(toolNames).toContain('create_site');
    expect(toolNames).toContain('get_site');
    expect(toolNames).toContain('delete_site');
    expect(toolNames).toContain('get_site_status');
    expect(toolNames).toContain('publish_content');
    expect(toolNames).toContain('sync_site');
    expect(toolNames).toContain('delete_files');
  });

  test('tools/list includes descriptions and input schemas', async () => {
    const handler = await getHandler();
    const body = await mcpCall(handler, 'tools/list') as { result: { tools: { name: string; description: string; inputSchema: { type: string } }[] } };

    for (const tool of body.result.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  test('tools/call auth_start initiates device auth flow', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          device_code: 'dev-123',
          user_code: 'ABCD-1234',
          verification_uri: 'https://flowershow.app/device',
          verification_uri_complete:
            'https://flowershow.app/device?code=ABCD-1234',
          expires_in: 900,
          interval: 5,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const handler = await getHandler();
    const body = await mcpCall(handler, 'tools/call', {
      name: 'auth_start',
      arguments: {},
    }) as { result: { content: { type: string; text: string }[] } };

    expect(body.result).toBeDefined();
    expect(body.result.content).toHaveLength(1);
    expect(body.result.content[0].type).toBe('text');
    expect(body.result.content[0].text).toContain('authenticate');
    expect(body.result.content[0].text).toContain('ABCD-1234');
  });

  test('tools/call get_user returns not-authenticated without token', async () => {
    const handler = await getHandler();
    const body = await mcpCall(handler, 'tools/call', {
      name: 'get_user',
      arguments: {},
    }) as { result: { isError: boolean; content: { text: string }[] } };

    expect(body.result).toBeDefined();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('Not authenticated');
  });

  test('tools/call list_sites returns not-authenticated without token', async () => {
    const handler = await getHandler();
    const body = await mcpCall(handler, 'tools/call', {
      name: 'list_sites',
      arguments: {},
    }) as { result: { isError: boolean; content: { text: string }[] } };

    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('Not authenticated');
  });

  test('tools/call with unknown tool returns error', async () => {
    const handler = await getHandler();
    const body = await mcpCall(handler, 'tools/call', {
      name: 'nonexistent_tool',
      arguments: {},
    }) as { error?: { code: number; message: string }; result?: { isError?: boolean } };

    // MCP protocol returns either a JSON-RPC error or a result with isError
    const hasError = body.error !== undefined || body.result?.isError === true;
    expect(hasError).toBe(true);
  });

  test('initialize handshake works', async () => {
    const handler = await getHandler();
    const body = await mcpCall(handler, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    }) as { result: { serverInfo: { name: string }; capabilities: unknown } };

    expect(body.result).toBeDefined();
    expect(body.result.serverInfo).toBeDefined();
    expect(body.result.serverInfo.name).toBe('Flowershow MCP');
    expect(body.result.capabilities).toBeDefined();
  });
});
