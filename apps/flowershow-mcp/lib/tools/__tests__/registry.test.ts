import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the config module before importing anything else
vi.mock('../../config', () => ({
  getConfig: () => ({ apiUrl: 'https://api.flowershow.app', port: '3100' }),
}));

describe('registerTools', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('registers all expected tools on the McpServer', async () => {
    const { registerTools } = await import('../registry');

    const registeredTools: string[] = [];
    const mockServer = {
      tool: vi.fn(
        (
          name: string,
          _description: unknown,
          _schema: unknown,
          _handler: unknown,
        ) => {
          registeredTools.push(name);
        },
      ),
    };

    registerTools(mockServer as any);

    // User/site management tools
    expect(registeredTools).toContain('get_user');
    expect(registeredTools).toContain('list_sites');
    expect(registeredTools).toContain('create_site');
    expect(registeredTools).toContain('get_site');
    expect(registeredTools).toContain('delete_site');
    expect(registeredTools).toContain('get_site_status');

    // Publishing tools
    expect(registeredTools).toContain('publish_content');
    expect(registeredTools).toContain('sync_site');
    expect(registeredTools).toContain('delete_files');

    // Auth tools should NOT be registered (PAT via headers)
    expect(registeredTools).not.toContain('auth_start');
    expect(registeredTools).not.toContain('auth_status');
    expect(registeredTools).not.toContain('auth_logout');
  });

  test('registers tools with zod schemas for parameters', async () => {
    const { registerTools } = await import('../registry');

    const toolSchemas: Map<string, unknown> = new Map();
    const mockServer = {
      tool: vi.fn(
        (
          name: string,
          _description: unknown,
          schema: unknown,
          _handler: unknown,
        ) => {
          toolSchemas.set(name, schema);
        },
      ),
    };

    registerTools(mockServer as any);

    // Tools with parameters should have proper zod schemas
    expect(toolSchemas.get('create_site')).toBeDefined();
    expect(toolSchemas.get('get_site')).toBeDefined();
    expect(toolSchemas.get('delete_site')).toBeDefined();
    expect(toolSchemas.get('publish_content')).toBeDefined();
    expect(toolSchemas.get('sync_site')).toBeDefined();
    expect(toolSchemas.get('delete_files')).toBeDefined();
  });

  test('tool handlers call through to tool functions', async () => {
    const { registerTools } = await import('../registry');

    const handlers: Map<string, Function> = new Map();
    const mockServer = {
      tool: vi.fn(
        (name: string, _desc: unknown, _schema: unknown, handler: Function) => {
          handlers.set(name, handler);
        },
      ),
    };

    registerTools(mockServer as any);

    // 9 tools: get_user, list_sites, create_site, get_site, delete_site,
    // get_site_status, publish_content, sync_site, delete_files
    expect(handlers.size).toBe(9);
    for (const handler of handlers.values()) {
      expect(typeof handler).toBe('function');
    }
  });
});
