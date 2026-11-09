import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type PublishDeps } from './publish';
import {
  createFlowershowMcpServer,
  LIST_FILES_MAX,
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
        role: 'owner',
        owner: 'alice',
      },
    ]),
    listFiles: vi.fn().mockResolvedValue([
      { path: 'about.md', size: 12, updatedAt: '2026-10-18T09:00:00.000Z' },
      { path: 'blog/one.md', size: 30, updatedAt: '2026-10-18T09:00:00.000Z' },
      { path: 'index.md', size: 20, updatedAt: '2026-10-18T09:00:00.000Z' },
    ]),
    readFile: vi.fn().mockResolvedValue('# Home\n\n- [About](about.md)\n'),
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

  it('adds list-sites, list-files and read-file with an account token', async () => {
    const client = await connect(USER, deps());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'claim-site',
      'list-files',
      'list-sites',
      'publish',
      'read-file',
    ]);
    for (const name of ['list-files', 'read-file']) {
      const tool = tools.find((t) => t.name === name);
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    }
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
          role: 'owner',
          owner: 'alice',
        },
      ],
    });
  });

  it('list-sites text marks shared sites as owner/name', async () => {
    const d = deps();
    (d.listSites as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        siteId: 's2',
        name: 'notes',
        url: 'https://notes-bob.flowershow.me',
        lastPublishedAt: null,
        role: 'editor',
        owner: 'bob',
      },
    ]);
    const client = await connect(USER, d);
    const res = await client.callTool({ name: 'list-sites', arguments: {} });
    expect(res.content).toEqual([
      {
        type: 'text',
        text: 'bob/notes (s2): https://notes-bob.flowershow.me (editor)',
      },
    ]);
    expect(res.structuredContent).toMatchObject({
      sites: [{ siteId: 's2', role: 'editor', owner: 'bob' }],
    });
  });

  it('lists the files on a site as the token user, never a user from the arguments', async () => {
    const d = deps();
    const client = await connect(USER, d);
    const res = await client.callTool({
      name: 'list-files',
      arguments: { siteId: 's1', userId: 'u2' },
    });
    expect(res.isError).toBeFalsy();
    expect(d.listFiles).toHaveBeenCalledWith('u1', 's1');
    expect(res.structuredContent).toMatchObject({
      siteId: 's1',
      total: 3,
      truncated: false,
    });
    const text = (res.content as { text: string }[])[0]?.text;
    expect(text).toMatch(/3 file\(s\) on site s1/);
    expect(text).toMatch(/^index\.md \(20 bytes\)$/m);
  });

  it('lists one folder when asked', async () => {
    const client = await connect(USER, deps());
    const res = await client.callTool({
      name: 'list-files',
      arguments: { siteId: 's1', folder: '/blog/' },
    });
    expect(res.structuredContent).toMatchObject({
      files: [expect.objectContaining({ path: 'blog/one.md' })],
      total: 1,
    });
  });

  it('caps a long file list and says how to see the rest', async () => {
    const many = Array.from({ length: LIST_FILES_MAX + 5 }, (_, i) => ({
      path: `p${String(i).padStart(5, '0')}.md`,
      size: 1,
      updatedAt: '2026-10-18T09:00:00.000Z',
    }));
    const client = await connect(
      USER,
      deps({ listFiles: vi.fn().mockResolvedValue(many) }),
    );
    const res = await client.callTool({
      name: 'list-files',
      arguments: { siteId: 's1' },
    });
    const out = res.structuredContent as {
      files: unknown[];
      total: number;
      truncated: boolean;
    };
    expect(out.files).toHaveLength(LIST_FILES_MAX);
    expect(out.total).toBe(LIST_FILES_MAX + 5);
    expect(out.truncated).toBe(true);
    expect((res.content as { text: string }[])[0]?.text).toMatch(/pass folder/);
  });

  it.each([
    ['list-files', { siteId: 'not-mine' }],
    ['read-file', { siteId: 'not-mine', path: 'index.md' }],
  ])("reports someone else's site as not found (%s)", async (name, args) => {
    const notFound = new ApiError(
      404,
      'not_found',
      'Site not found among the sites you can edit. Use list-sites to see them.',
    );
    const client = await connect(
      USER,
      deps({
        listFiles: vi.fn().mockRejectedValue(notFound),
        readFile: vi.fn().mockRejectedValue(notFound),
      }),
    );
    const res = await client.callTool({ name, arguments: args });
    expect(res.isError).toBe(true);
    expect((res.content as { text: string }[])[0]?.text).toBe(notFound.message);
  });

  it('reads a file as the token user, with the path normalised', async () => {
    const d = deps();
    const client = await connect(USER, d);
    const res = await client.callTool({
      name: 'read-file',
      arguments: { siteId: 's1', path: '/index.md' },
    });
    expect(res.isError).toBeFalsy();
    expect(d.readFile).toHaveBeenCalledWith('u1', 's1', 'index.md');
    expect(res.structuredContent).toEqual({
      siteId: 's1',
      path: 'index.md',
      content: '# Home\n\n- [About](about.md)\n',
    });
  });

  it('hides internal read errors from the model', async () => {
    const client = await connect(
      USER,
      deps({ readFile: vi.fn().mockRejectedValue(new Error('S3 down')) }),
    );
    const res = await client.callTool({
      name: 'read-file',
      arguments: { siteId: 's1', path: 'index.md' },
    });
    expect(res.isError).toBe(true);
    const text = (res.content as { text: string }[])[0]?.text;
    expect(text).toMatch(/went wrong while reading the file/);
    expect(text).not.toMatch(/S3/);
  });

  it('tells the signed-in model to check the site and read a page before changing it', async () => {
    const client = await connect(USER, deps());
    const { tools } = await client.listTools();
    const description = tools.find((t) => t.name === 'publish')?.description;
    expect(description).toMatch(/list-files/);
    expect(description).toMatch(/read-file/);
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
    'tells the model updates are partial, with delete and replaceWholeSite (%s)',
    async (_label, mode) => {
      const client = await connect(mode, deps());
      const { tools } = await client.listTools();
      const publishTool = tools.find((t) => t.name === 'publish');
      expect(publishTool?.description).toMatch(/kept as they are/);
      expect(publishTool?.description).not.toMatch(
        /files left out are removed/,
      );
      expect(publishTool?.inputSchema.properties).toHaveProperty('delete');
      expect(publishTool?.inputSchema.properties).toHaveProperty(
        'replaceWholeSite',
      );
      expect(publishTool?.inputSchema.properties).toHaveProperty(
        'confirmDeleteCount',
      );
      expect(publishTool?.inputSchema.properties).not.toHaveProperty('replace');
      expect(publishTool?.description).toMatch(/confirmDeleteCount/);
    },
  );

  it.each([
    ['anonymous', { kind: 'anon' } as McpMode],
    ['signed in', USER],
  ])(
    'tells the model to show the files and site, and to ask only when it matters (%s)',
    async (_label, mode) => {
      const client = await connect(mode, deps());
      const { tools } = await client.listTools();
      const description = tools.find((t) => t.name === 'publish')?.description;
      expect(description).toMatch(/every path/);
      expect(description).toMatch(/which site/);
      expect(description).toMatch(/private or sensitive/);
      expect(description).toMatch(/delete or replaceWholeSite/);
      expect(description).toMatch(/new site when the user meant to update/);
      expect(description).toMatch(/differs? from what the user asked/);
      expect(description).toMatch(
        /already named the files, asked for the removal or said to go ahead/,
      );
      // Lightweight policy: no mandatory confirm step before every publish.
      expect(description).not.toMatch(
        /always (ask|wait)|before every publish/i,
      );
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

  it('replaces the whole site only when asked to (dry run first)', async () => {
    const d = deps();
    const client = await connect(USER, d);
    await client.callTool({
      name: 'publish',
      arguments: {
        siteId: 'site-1',
        replaceWholeSite: true,
        files: [{ path: 'index.html', content: '<h1>new</h1>' }],
      },
    });
    expect(d.sync).toHaveBeenNthCalledWith(
      1,
      'site-1',
      expect.any(Array),
      { userId: 'u1' },
      { mode: 'replace', delete: [], dryRun: true },
    );
    expect(d.sync).toHaveBeenLastCalledWith(
      'site-1',
      expect.any(Array),
      { userId: 'u1' },
      { mode: 'replace', delete: [] },
    );
  });

  it('refuses a replace that would remove files until confirmed', async () => {
    const d = deps();
    vi.mocked(d.sync).mockResolvedValue({
      toUpload: [],
      toUpdate: [],
      deleted: ['old.html'],
      unchanged: ['index.html'],
      summary: { toUpload: 0, toUpdate: 0, deleted: 1, unchanged: 1 },
    });
    const client = await connect(USER, d);
    const res = await client.callTool({
      name: 'publish',
      arguments: {
        siteId: 'site-1',
        replaceWholeSite: true,
        files: [{ path: 'index.html', content: '<h1>new</h1>' }],
      },
    });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toMatch(
      /remove 1 file\(s\).*old\.html.*confirmDeleteCount: 1/,
    );
    expect(d.sync).toHaveBeenCalledTimes(1);
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
