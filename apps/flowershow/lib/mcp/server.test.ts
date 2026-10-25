import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type PublishDeps } from './publish';
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

const USER: McpMode = {
  kind: 'user',
  userId: 'u1',
  via: 'oauth',
  scopes: ['sites:write'],
};

function deps(over: Partial<McpDeps> = {}): McpDeps {
  const publish: PublishDeps = {
    createAnonSite: vi.fn().mockResolvedValue(ANON),
    createUserSite: vi.fn().mockResolvedValue({
      siteId: 's-new',
      liveUrl: 'https://new-alice.flowershow.me',
    }),
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
        lastPublishedAt: '2026-10-18T09:00:00.000Z',
      },
    ]),
    claimSite: vi.fn().mockResolvedValue({
      siteId: 'site-1',
      name: 'p',
      url: 'https://p-anon.flowershow.me',
    }),
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
    const client = await connect(USER, deps());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'claim-site',
      'list-sites',
      'publish',
    ]);
    const publish = tools.find((t) => t.name === 'publish');
    expect(publish?.description).toMatch(/account/);
    expect(publish?.description).not.toMatch(/expires in 7 days/);
    expect(publish?.inputSchema.properties).toHaveProperty('name');
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
    const client = await connect(USER, d);
    const res = await client.callTool({ name: 'list-sites', arguments: {} });
    expect(d.listSites).toHaveBeenCalledWith('u1');
    expect(res.structuredContent).toEqual({
      sites: [
        {
          siteId: 's1',
          name: 'notes',
          url: 'https://notes-alice.flowershow.me',
          lastPublishedAt: '2026-10-18T09:00:00.000Z',
        },
      ],
    });
  });

  it('keeps the anonymous tool surface unchanged (no name argument)', async () => {
    const client = await connect({ kind: 'anon' }, deps());
    const { tools } = await client.listTools();
    expect(tools[0]?.inputSchema.properties).not.toHaveProperty('name');
  });

  it('publishes into the account as the token user', async () => {
    const d = deps();
    const client = await connect(USER, d);
    const res = await client.callTool({
      name: 'publish',
      arguments: { files: [{ path: 'index.md', content: '# Notes' }] },
    });
    expect(res.isError).toBeFalsy();
    expect(d.createUserSite).toHaveBeenCalledWith('u1', 'Notes');
    expect(d.createAnonSite).not.toHaveBeenCalled();
  });

  it.each([
    ['anonymous', { kind: 'anon' } as McpMode],
    ['signed in', USER],
  ])(
    'tells the model updates are partial, with delete and replace (%s)',
    async (_label, mode) => {
      const client = await connect(mode, deps());
      const { tools } = await client.listTools();
      const publishTool = tools.find((t) => t.name === 'publish');
      expect(publishTool?.description).toMatch(/kept as they are/);
      expect(publishTool?.description).not.toMatch(
        /files left out are removed/,
      );
      expect(publishTool?.inputSchema.properties).toHaveProperty('delete');
      expect(publishTool?.inputSchema.properties).toHaveProperty('replace');
    },
  );

  it.each([
    ['anonymous', { kind: 'anon' } as McpMode, { claimToken: 'fs_claim_x' }],
    ['signed in', USER, { userId: 'u1' }],
  ])(
    'updates one page and deletes another without replacing the site (%s)',
    async (_label, mode, credential) => {
      const d = deps();
      const client = await connect(mode, d);
      const res = await client.callTool({
        name: 'publish',
        arguments: {
          siteId: 'site-1',
          claimToken: 'fs_claim_x',
          files: [{ path: 'index.html', content: '<h1>v2</h1>' }],
          delete: ['old.html'],
        },
      });
      expect(res.isError).toBeFalsy();
      expect(d.sync).toHaveBeenCalledWith(
        'site-1',
        [expect.objectContaining({ path: 'index.html' })],
        credential,
        { mode: 'merge', delete: ['old.html'] },
      );
    },
  );

  it('replaces the whole site only when asked to', async () => {
    const d = deps();
    const client = await connect(USER, d);
    await client.callTool({
      name: 'publish',
      arguments: {
        siteId: 'site-1',
        replace: true,
        files: [{ path: 'index.html', content: '<h1>new</h1>' }],
      },
    });
    expect(d.sync).toHaveBeenCalledWith(
      'site-1',
      expect.any(Array),
      { userId: 'u1' },
      { mode: 'replace', delete: [] },
    );
  });

  it('claims an anonymous site into the account', async () => {
    const d = deps();
    const client = await connect(USER, d);
    const res = await client.callTool({
      name: 'claim-site',
      arguments: { siteId: 'site-1', claimToken: 'fs_claim_x' },
    });
    expect(d.claimSite).toHaveBeenCalledWith('u1', 'site-1', 'fs_claim_x');
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toMatchObject({
      siteId: 'site-1',
      liveUrl: 'https://p-anon.flowershow.me',
    });
  });

  it('reports a failed claim as a tool error with the reason', async () => {
    const client = await connect(
      USER,
      deps({
        claimSite: vi
          .fn()
          .mockRejectedValue(
            new ApiError(409, 'claim_failed', 'already in an account'),
          ),
      }),
    );
    const res = await client.callTool({
      name: 'claim-site',
      arguments: { siteId: 'site-1', claimToken: 'fs_claim_x' },
    });
    expect(res.isError).toBe(true);
    expect((res.content as { text: string }[])[0]?.text).toBe(
      'already in an account',
    );
  });
});
