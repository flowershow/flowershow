import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cli-auth', () => ({ validateAccessToken: vi.fn() }));
vi.mock('@/lib/mcp/deps', () => ({ realMcpDeps: vi.fn(() => ({})) }));

import { validateAccessToken } from '@/lib/cli-auth';
import { GET, POST } from './route';

const validate = validateAccessToken as ReturnType<typeof vi.fn>;

function rpc(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('https://flowershow.app/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const listTools = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
const toolNames = async (res: Response) =>
  ((await res.json()).result.tools as { name: string }[]).map((t) => t.name);

beforeEach(() => {
  vi.clearAllMocks();
  validate.mockResolvedValue(null);
});

describe('/api/mcp', () => {
  it('serves tools/list without auth (anonymous publishing)', async () => {
    const res = await POST(rpc(listTools));
    expect(res.status).toBe(200);
    expect(await toolNames(res)).toEqual(['publish']);
  });

  it('accepts a valid account token and adds list-sites', async () => {
    validate.mockResolvedValue({ userId: 'u1' });
    const res = await POST(
      rpc(listTools, { authorization: 'Bearer fs_pat_ok' }),
    );
    expect(res.status).toBe(200);
    expect((await toolNames(res)).sort()).toEqual(['list-sites', 'publish']);
  });

  it.each(['Bearer fs_pat_revoked', 'Bearer garbage', 'Basic abc'])(
    'rejects authorization %j with 401',
    async (authorization) => {
      const res = await POST(rpc(listTools, { authorization }));
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe(-32001);
    },
  );

  it('answers GET (no server-to-client stream in stateless mode) with 405', async () => {
    const res = GET();
    expect(res.status).toBe(405);
  });
});
