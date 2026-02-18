import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LoggingMessageNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type FlowershowApi } from '../lib/api.js';
import { registerSiteTools } from './sites.js';

// ---------------------------------------------------------------------------
// Helper: create an MCP client connected to a server with registerSiteTools
// ---------------------------------------------------------------------------

async function createTestClient(api: FlowershowApi) {
  const server = new McpServer(
    { name: 'test', version: '0.0.1' },
    { capabilities: { logging: {} } },
  );
  registerSiteTools(server, api);

  const client = new Client({ name: 'test-client', version: '0.0.1' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { client, server };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerSiteTools', () => {
  const mockApi = {
    listSites: vi.fn(),
  } as unknown as FlowershowApi;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a list-sites tool', async () => {
    const { client } = await createTestClient(mockApi);
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('list-sites');
    expect(tools[0].description).toBe('List all your Flowershow sites');
  });

  describe('list-sites tool', () => {
    it('returns helpful message when user has no sites', async () => {
      (mockApi.listSites as ReturnType<typeof vi.fn>).mockResolvedValue({
        sites: [],
        total: 0,
      });

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'list-sites',
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'You have no sites yet. Create one at https://flowershow.app or using the Flowershow CLI.',
        },
      ]);
      expect(result.isError).toBeFalsy();
    });

    it('formats a single site correctly', async () => {
      (mockApi.listSites as ReturnType<typeof vi.fn>).mockResolvedValue({
        sites: [
          {
            id: 's1',
            projectName: 'my-docs',
            url: 'https://my-docs.flowershow.app',
            fileCount: 10,
            updatedAt: '2025-06-15T12:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
          },
        ],
        total: 1,
      });

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'list-sites',
        arguments: {},
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('Found 1 site:');
      expect(text).toContain('**my-docs**');
      expect(text).toContain('10 files');
      expect(text).toContain('https://my-docs.flowershow.app');
      expect(text).toContain('2025-06-15T12:00:00Z');
      expect(result.isError).toBeFalsy();
    });

    it('formats multiple sites with correct plural', async () => {
      (mockApi.listSites as ReturnType<typeof vi.fn>).mockResolvedValue({
        sites: [
          {
            id: 's1',
            projectName: 'site-a',
            url: 'https://a.flowershow.app',
            fileCount: 5,
            updatedAt: '2025-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 's2',
            projectName: 'site-b',
            url: 'https://b.flowershow.app',
            fileCount: 20,
            updatedAt: '2025-02-01T00:00:00Z',
            createdAt: '2024-06-01T00:00:00Z',
          },
        ],
        total: 2,
      });

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'list-sites',
        arguments: {},
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('Found 2 sites:');
      expect(text).toContain('**site-a**');
      expect(text).toContain('**site-b**');
      expect(result.isError).toBeFalsy();
    });

    it('returns auth error message on 401', async () => {
      (mockApi.listSites as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApiError(401, 'Unauthorized', '{"error":"bad token"}'),
      );

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'list-sites',
        arguments: {},
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('Authentication failed');
      expect(text).toContain('FLOWERSHOW_PAT');
      expect(result.isError).toBe(true);
    });

    it('returns generic API error message on non-401 ApiError', async () => {
      (mockApi.listSites as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApiError(500, 'Internal Server Error', 'boom'),
      );

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'list-sites',
        arguments: {},
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('API error');
      expect(text).toContain('500');
      expect(result.isError).toBe(true);
    });

    it('handles unexpected non-Error throws', async () => {
      (mockApi.listSites as ReturnType<typeof vi.fn>).mockRejectedValue(
        'string error',
      );

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'list-sites',
        arguments: {},
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('Failed to list sites');
      expect(text).toContain('Unknown error');
      expect(result.isError).toBe(true);
    });

    it('handles Error instances that are not ApiError', async () => {
      (mockApi.listSites as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('network timeout'),
      );

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'list-sites',
        arguments: {},
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('Failed to list sites');
      expect(text).toContain('network timeout');
      expect(result.isError).toBe(true);
    });

    it('sends logging messages to the client during execution', async () => {
      (mockApi.listSites as ReturnType<typeof vi.fn>).mockResolvedValue({
        sites: [
          {
            id: 's1',
            projectName: 'my-docs',
            url: 'https://my-docs.flowershow.app',
            fileCount: 10,
            updatedAt: '2025-06-15T12:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
          },
        ],
        total: 1,
      });

      const { client } = await createTestClient(mockApi);

      const logs: Array<{ level: string; data: unknown }> = [];
      client.setNotificationHandler(
        LoggingMessageNotificationSchema,
        (notification) => {
          logs.push({
            level: notification.params.level,
            data: notification.params.data,
          });
        },
      );

      await client.callTool({ name: 'list-sites', arguments: {} });

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs[0]).toMatchObject({ level: 'info', data: 'Fetching sites…' });
      expect(logs[1]).toMatchObject({ level: 'info', data: 'Found 1 site' });
    });

    it('sends error-level log message on failure', async () => {
      (mockApi.listSites as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApiError(401, 'Unauthorized', '{"error":"bad token"}'),
      );

      const { client } = await createTestClient(mockApi);

      const logs: Array<{ level: string; data: unknown }> = [];
      client.setNotificationHandler(
        LoggingMessageNotificationSchema,
        (notification) => {
          logs.push({
            level: notification.params.level,
            data: notification.params.data,
          });
        },
      );

      await client.callTool({ name: 'list-sites', arguments: {} });

      const errorLog = logs.find((l) => l.level === 'error');
      expect(errorLog).toBeDefined();
      expect(errorLog!.data).toContain('Authentication failed');
    });
  });
});
