import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cli-auth', () => ({ validateAccessToken: vi.fn() }));
vi.mock('@/lib/mcp/deps', () => ({ realMcpDeps: vi.fn(() => ({})) }));

import { validateAccessToken } from '@/lib/cli-auth';
import { realMcpDeps } from '@/lib/mcp/deps';
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
    expect((await toolNames(res)).sort()).toEqual([
      'claim-site',
      'list-sites',
      'publish',
    ]);
  });

  it.each(['Bearer fs_pat_revoked', 'Bearer garbage', 'Basic abc'])(
    'rejects authorization %j with 401',
    async (authorization) => {
      const res = await POST(rpc(listTools, { authorization }));
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe(-32001);
    },
  );

  it('accepts a lowercase bearer scheme', async () => {
    validate.mockResolvedValue({ userId: 'u1' });
    const res = await POST(
      rpc(listTools, { authorization: 'bearer fs_pat_ok' }),
    );
    expect(res.status).toBe(200);
  });

  it('explains that a claim token goes in the tool arguments, not the header', async () => {
    const res = await POST(
      rpc(listTools, { authorization: 'Bearer fs_claim_abc' }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(/^Bearer/);
    expect((await res.json()).error.message).toMatch(/claimToken/);
  });

  it('rejects JSON-RPC batches (one request must not run many publishes)', async () => {
    const res = await POST(rpc([listTools, { ...listTools, id: 2 }]));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/batch/i);
  });

  it('rejects an oversized request with a hint to use the CLI', async () => {
    const big = 'x'.repeat(4 * 1024 * 1024 + 1);
    const res = await POST(
      rpc({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'publish',
          arguments: { files: [{ path: 'a.md', content: big }] },
        },
      }),
    );
    expect(res.status).toBe(413);
    expect((await res.json()).error.message).toMatch(/fl/);
  });

  it('rejects malformed JSON with a parse error', async () => {
    const res = await POST(
      new NextRequest('https://flowershow.app/api/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{nope',
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe(-32700);
  });

  const initialize = {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    },
  };

  it('hands anonymous clients a session id on initialize (for per-caller limits)', async () => {
    const res = await POST(rpc(initialize));
    expect(res.status).toBe(200);
    expect(res.headers.get('mcp-session-id')).toMatch(/^[0-9a-f-]{36}$/);
    expect((await res.json()).result.serverInfo.name).toBe('flowershow');
  });

  it('does not hand signed-in clients a session id', async () => {
    validate.mockResolvedValue({ userId: 'u1' });
    const res = await POST(
      rpc(initialize, { authorization: 'Bearer fs_pat_ok' }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('mcp-session-id')).toBeNull();
  });

  it('still serves requests that carry the session id back', async () => {
    const res = await POST(rpc(listTools, { 'mcp-session-id': 'abc' }));
    expect(res.status).toBe(200);
  });

  it('identifies the anonymous caller by IP and session (or ChatGPT user id)', async () => {
    await POST(
      rpc(
        { ...listTools, params: { _meta: { 'openai/subject': 'u-9' } } },
        { 'x-forwarded-for': '203.0.113.7', 'mcp-session-id': 'abc' },
      ),
    );
    expect(realMcpDeps).toHaveBeenCalledWith({
      ip: '203.0.113.7',
      callerId: 'openai:u-9',
    });
  });

  it('answers GET (no server-to-client stream in stateless mode) with 405', async () => {
    const res = await GET(rpc(listTools));
    expect(res.status).toBe(405);
  });
});
