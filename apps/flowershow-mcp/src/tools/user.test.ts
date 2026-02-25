import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type FlowershowApi } from '../lib/api.js';
import { registerUserTools } from './user.js';

async function createTestClient(api: FlowershowApi) {
  const server = new McpServer(
    { name: 'test', version: '0.0.1' },
    { capabilities: { logging: {} } },
  );
  registerUserTools(server, api);

  const client = new Client({ name: 'test-client', version: '0.0.1' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { client, server };
}

describe('registerUserTools', () => {
  const mockApi = {
    getUser: vi.fn(),
  } as unknown as FlowershowApi;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a get-user tool', async () => {
    const { client } = await createTestClient(mockApi);
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('get-user');
  });

  it('returns user profile on success', async () => {
    (mockApi.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'u1',
      username: 'alice',
      name: 'Alice Smith',
      email: 'alice@example.com',
      image: null,
      role: 'USER',
    });

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({ name: 'get-user', arguments: {} });

    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain('alice');
    expect(text).toContain('Alice Smith');
    expect(result.isError).toBeFalsy();
  });

  it('handles user with null name and email', async () => {
    (mockApi.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'u2',
      username: 'bob',
      name: null,
      email: null,
      image: null,
      role: 'USER',
    });

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({ name: 'get-user', arguments: {} });

    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain('bob');
    expect(result.isError).toBeFalsy();
  });

  it('returns auth error on 401', async () => {
    (mockApi.getUser as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(401, 'Unauthorized', ''),
    );

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({ name: 'get-user', arguments: {} });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain('Authentication failed');
  });
});
