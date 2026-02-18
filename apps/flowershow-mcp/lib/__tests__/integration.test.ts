import { beforeEach, describe, expect, test, vi } from 'vitest';

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
    token?: string,
  ): Request {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return new Request('http://localhost:3100/api/mcp', {
      method: 'POST',
      headers,
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
    token?: string,
  ): Promise<Record<string, unknown>> {
    const req = mcpRequest(method, params, id, token);
    const res = await handler(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    return parseSseResponse(text) as Record<string, unknown>;
  }

  async function getHandler() {
    const { createMcpHandler } = await import('mcp-handler');
    const { registerTools } = await import('../tools/registry');
    const tokenStore = await import('../token-store');

    const mcpHandler = createMcpHandler(
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

    // Wrap the MCP handler like the real route does — extract Authorization
    // header and set it in the token store
    return async (request: Request): Promise<Response> => {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        tokenStore.setToken(authHeader.slice(7));
      } else {
        tokenStore.clearToken();
      }
      try {
        return await mcpHandler(request);
      } finally {
        tokenStore.clearToken();
      }
    };
  }

  test('tools/list returns all 9 registered tools', async () => {
    const handler = await getHandler();
    const body = (await mcpCall(handler, 'tools/list')) as {
      result?: { tools?: { name: string }[] };
    };
    expect(body.result).toBeDefined();
    expect(body.result!.tools).toBeDefined();
    expect(body.result!.tools).toHaveLength(9);

    const toolNames = body.result!.tools!.map((t) => t.name);
    // No auth tools
    expect(toolNames).not.toContain('auth_start');
    expect(toolNames).not.toContain('auth_status');
    expect(toolNames).not.toContain('auth_logout');
    // User/site management tools
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
    const body = (await mcpCall(handler, 'tools/list')) as {
      result: {
        tools: {
          name: string;
          description: string;
          inputSchema: { type: string };
        }[];
      };
    };

    for (const tool of body.result.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  test('tools/call get_user returns not-authenticated without Authorization header', async () => {
    const handler = await getHandler();
    const body = (await mcpCall(handler, 'tools/call', {
      name: 'get_user',
      arguments: {},
    })) as { result: { isError: boolean; content: { text: string }[] } };

    expect(body.result).toBeDefined();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('Not authenticated');
  });

  test('tools/call list_sites returns not-authenticated without Authorization header', async () => {
    const handler = await getHandler();
    const body = (await mcpCall(handler, 'tools/call', {
      name: 'list_sites',
      arguments: {},
    })) as { result: { isError: boolean; content: { text: string }[] } };

    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('Not authenticated');
  });

  test('tools/call get_user works with valid PAT in Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'u1',
          username: 'alice',
          email: 'alice@example.com',
          name: 'Alice',
          image: null,
          role: 'user',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const handler = await getHandler();
    const body = (await mcpCall(
      handler,
      'tools/call',
      { name: 'get_user', arguments: {} },
      1,
      'fs_pat_test_token_123',
    )) as { result: { content: { type: string; text: string }[] } };

    expect(body.result).toBeDefined();
    expect(body.result.content[0].type).toBe('text');
    expect(body.result.content[0].text).toContain('alice');
  });

  test('tools/call with unknown tool returns error', async () => {
    const handler = await getHandler();
    const body = (await mcpCall(handler, 'tools/call', {
      name: 'nonexistent_tool',
      arguments: {},
    })) as {
      error?: { code: number; message: string };
      result?: { isError?: boolean };
    };

    // MCP protocol returns either a JSON-RPC error or a result with isError
    const hasError = body.error !== undefined || body.result?.isError === true;
    expect(hasError).toBe(true);
  });

  test('initialize handshake works', async () => {
    const handler = await getHandler();
    const body = (await mcpCall(handler, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    })) as { result: { serverInfo: { name: string }; capabilities: unknown } };

    expect(body.result).toBeDefined();
    expect(body.result.serverInfo).toBeDefined();
    expect(body.result.serverInfo.name).toBe('Flowershow MCP');
    expect(body.result.capabilities).toBeDefined();
  });
});
