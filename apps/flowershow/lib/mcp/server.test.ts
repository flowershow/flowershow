import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it, vi } from 'vitest';
import type { PublishDeps } from './publish';
import {
  createFlowershowMcpServer,
  type McpDeps,
  type McpMode,
} from './server';

const ANON = {
  siteId: 'site-1',
  projectName: 'p',
  liveUrl: 'https://p-anon.flowershow.me',
  claimToken: 'fs_claim_new',
  claimUrl: 'https://flowershow.app/claim?siteId=site-1#token=fs_claim_new',
  expiresAt: '2026-10-09T12:00:00.000Z',
};

function deps(over: Partial<McpDeps> = {}): McpDeps {
  const publish: PublishDeps = {
    createAnonSite: vi.fn().mockResolvedValue(ANON),
    sync: vi.fn().mockResolvedValue({
      toUpload: [
        { path: 'index.html', uploadUrl: 'u', contentType: 'text/html' },
      ],
      toUpdate: [],
      deleted: [],
      unchanged: [],
      summary: { toUpload: 1, toUpdate: 0, deleted: 0, unchanged: 0 },
    }),
    upload: vi.fn().mockResolvedValue(undefined),
    status: vi.fn().mockResolvedValue({ status: 'complete' }),
    siteUrl: vi.fn().mockResolvedValue('https://x.flowershow.me'),
    sleep: vi.fn().mockResolvedValue(undefined),
  };
  return {
    ...publish,
    listSites: vi.fn().mockResolvedValue([
      {
        siteId: 's1',
        name: 'notes',
        url: 'https://notes-alice.flowershow.me',
      },
    ]),
    ...over,
  };
}

async function connect(mode: McpMode, d: McpDeps) {
  const server = createFlowershowMcpServer(mode, d);
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientT);
  return client;
}

describe('Flowershow MCP server', () => {
  it('offers publish (not list-sites) without an account token', async () => {
    const client = await connect({ kind: 'anon' }, deps());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(['publish']);
    const publish = tools[0];
    expect(publish?.description).toMatch(/publish this|put this online/i);
    expect(publish?.description).toMatch(/claim/i);
    expect(publish?.annotations?.destructiveHint).toBe(true);
  });

  it('adds list-sites with an account token', async () => {
    const client = await connect(
      { kind: 'user', token: 'fs_pat_x', userId: 'u1' },
      deps(),
    );
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['list-sites', 'publish']);
  });

  it('publishes anonymously and returns the claim link as text and structured content', async () => {
    const client = await connect({ kind: 'anon' }, deps());
    const res = await client.callTool({
      name: 'publish',
      arguments: { files: [{ path: 'index.html', content: '<h1>hi</h1>' }] },
    });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toMatchObject({
      liveUrl: ANON.liveUrl,
      claimUrl: ANON.claimUrl,
      siteId: 'site-1',
      claimToken: 'fs_claim_new',
    });
    const text = (res.content as { type: string; text: string }[])[0]?.text;
    expect(text).toContain(ANON.claimUrl);
  });

  it('returns validation problems as a tool error, not a protocol error', async () => {
    const d = deps();
    const client = await connect({ kind: 'anon' }, d);
    const res = await client.callTool({
      name: 'publish',
      arguments: { files: [{ path: '../x.md', content: 'x' }] },
    });
    expect(res.isError).toBe(true);
    expect((res.content as { type: string; text: string }[])[0]?.text).toMatch(
      /Invalid path/,
    );
    expect(d.createAnonSite).not.toHaveBeenCalled();
  });

  it('hides internal errors from the model', async () => {
    const client = await connect(
      { kind: 'anon' },
      deps({
        createAnonSite: vi.fn().mockRejectedValue(new Error('db password=x')),
      }),
    );
    const res = await client.callTool({
      name: 'publish',
      arguments: { files: [{ path: 'index.html', content: 'x' }] },
    });
    expect(res.isError).toBe(true);
    const text = (res.content as { type: string; text: string }[])[0]?.text;
    expect(text).not.toContain('password');
    expect(text).toMatch(/something went wrong/i);
  });

  it('lists the account sites', async () => {
    const d = deps();
    const client = await connect(
      { kind: 'user', token: 'fs_pat_x', userId: 'u1' },
      d,
    );
    const res = await client.callTool({ name: 'list-sites', arguments: {} });
    expect(d.listSites).toHaveBeenCalledWith('u1');
    expect(res.structuredContent).toEqual({
      sites: [
        {
          siteId: 's1',
          name: 'notes',
          url: 'https://notes-alice.flowershow.me',
        },
      ],
    });
  });
});
