/**
 * End to end through the MCP server, the production deps and the real sync
 * route, with the database and R2 replaced by one in-memory site. Guards the
 * launch promise "in a later chat, the AI adds pages and leaves the rest of
 * the site as it was" (flwrprd-4oi.3).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { path: string; sha: string; size: number; updatedAt: Date };

// The fake world: sites, their files (Blob rows) and the stored bytes.
const world = vi.hoisted(() => ({
  sites: new Map<string, { id: string; userId: string; projectName: string }>(),
  blobs: new Map<string, Map<string, Row>>(),
  objects: new Map<string, string>(),
  publishes: 0,
}));

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
    NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.me',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
  },
}));

vi.mock('@/server/db', () => {
  const rows = (siteId: string) => {
    let m = world.blobs.get(siteId);
    if (!m) {
      m = new Map();
      world.blobs.set(siteId, m);
    }
    return m;
  };
  const site = (id: string) => {
    const s = world.sites.get(id);
    return s
      ? {
          ...s,
          customDomain: null,
          subdomain: s.projectName,
          user: { username: s.userId },
          anonymousOwnerId: null,
          expiresAt: null,
        }
      : null;
  };
  return {
    default: {
      site: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          site(where.id),
        ),
      },
      blob: {
        findMany: vi.fn(async ({ where }: { where: { siteId: string } }) => [
          ...rows(where.siteId).values(),
        ]),
      },
      publish: {
        create: vi.fn(async () => ({ id: `pub-${++world.publishes}` })),
      },
      publishFile: {
        updateMany: vi.fn(async () => ({ count: 0 })),
        createMany: vi.fn(async () => ({ count: 0 })),
        findMany: vi.fn(async () => []),
      },
    },
  };
});

// R2: deleting an object also drops its Blob row (what the worker does on
// the delete event); uploads are applied by the test's `upload` dep.
vi.mock('@/lib/content-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/content-store')>()),
  deleteFile: vi.fn(
    async ({ projectId, path }: { projectId: string; path: string }) => {
      world.objects.delete(`${projectId}/main/raw/${path}`);
      world.blobs.get(projectId)?.delete(path);
    },
  ),
  generatePresignedUploadUrl: vi.fn(async (key: string) => `mem://${key}`),
  fetchFile: vi.fn(
    async ({ projectId, path }: { projectId: string; path: string }) =>
      world.objects.get(`${projectId}/main/raw/${path}`) ?? null,
  ),
}));

vi.mock('@/app/api/sites/route', () => ({
  POST: vi.fn(async (req: Request) => {
    const { projectName } = await req.json();
    const id = `site-${world.sites.size + 1}`;
    world.sites.set(id, { id, userId: 'u1', projectName });
    return NextResponse.json({
      site: { id, url: `https://${projectName}.flowershow.me` },
    });
  }),
}));
vi.mock('@/app/api/sites/id/[siteId]/status/route', () => ({ GET: vi.fn() }));
vi.mock('@/lib/cloudflare-worker', () => ({
  startPublishFinalizerWorkflow: vi.fn(async () => {}),
}));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn(async () => {}),
  }),
}));
vi.mock('@/lib/otel-logger', () => ({
  log: vi.fn(),
  flushLogs: vi.fn(async () => {}),
  SeverityNumber: { ERROR: 17 },
}));
vi.mock('@/lib/anon-site', () => ({ createAnonSite: vi.fn() }));
vi.mock('@/lib/claim-anon-site', () => ({ claimAnonSite: vi.fn() }));
vi.mock('./limits', () => ({
  checkAnonCreateLimits: vi.fn(async () => null),
  checkAnonUpdateLimit: vi.fn(async () => true),
  reportGlobalLimitReached: vi.fn(async () => {}),
  signInHint: () => '',
  MCP_ANON_LIMITS: { perCaller: 10, perIp: 10, perSiteUpdates: 60 },
}));

import { realMcpDeps } from './deps';
import { gitBlobSha } from './git-sha';
import { createFlowershowMcpServer, type McpDeps } from './server';

/** Production deps, with the upload landing in the fake R2 and Blob table. */
function deps(): McpDeps {
  return {
    ...realMcpDeps(),
    async upload(url, bytes) {
      const key = url.replace(/^mem:\/\//, '');
      const [siteId, , , ...rest] = key.split('/');
      const path = rest.join('/');
      world.objects.set(key, new TextDecoder().decode(bytes));
      world.blobs.get(siteId as string)?.set(path, {
        path,
        sha: gitBlobSha(bytes),
        size: bytes.byteLength,
        updatedAt: new Date(),
      });
    },
    status: async () => ({ status: 'complete' }),
    sleep: async () => {},
  };
}

async function connectAs(userId: string) {
  const server = createFlowershowMcpServer(
    { kind: 'user', userId, via: 'oauth', scopes: [] },
    deps(),
  );
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientT);
  return client;
}

async function call(
  client: Client,
  name: string,
  args: Record<string, unknown>,
) {
  const res = await client.callTool({ name, arguments: args });
  return {
    isError: !!res.isError,
    text: (res.content as { text: string }[])[0]?.text ?? '',
    data: res.structuredContent as Record<string, unknown> | undefined,
  };
}

const sitePaths = (siteId: string) =>
  [...(world.blobs.get(siteId)?.keys() ?? [])].sort();
const content = (siteId: string, path: string) =>
  world.objects.get(`${siteId}/main/raw/${path}`);

beforeEach(() => {
  world.sites.clear();
  world.blobs.clear();
  world.objects.clear();
  world.publishes = 0;
});

describe('MCP publish to an existing site (partial publish)', () => {
  it('adds and replaces only the files sent, and deletes only on request', async () => {
    // Chat 1: a new site with A and B.
    const chat1 = await connectAs('u1');
    const first = await call(chat1, 'publish', {
      files: [
        { path: 'index.md', content: '# Notes\n\n- [About](about.md)\n' },
        { path: 'about.md', content: '# About\n' },
      ],
    });
    expect(first.isError).toBe(false);
    const siteId = first.data?.siteId as string;
    expect(sitePaths(siteId)).toEqual(['about.md', 'index.md']);

    // Chat 2 (no memory of chat 1): sees the files, reads the home page,
    // then sends only a new page C and the changed home page A.
    const chat2 = await connectAs('u1');
    const listed = await call(chat2, 'list-files', { siteId });
    expect(listed.data?.files).toEqual([
      expect.objectContaining({ path: 'about.md' }),
      expect.objectContaining({ path: 'index.md' }),
    ]);
    const home = await call(chat2, 'read-file', { siteId, path: 'index.md' });
    expect(home.text).toBe('# Notes\n\n- [About](about.md)\n');

    const update = await call(chat2, 'publish', {
      siteId,
      files: [
        { path: 'deep-work.md', content: '# Deep Work\n' },
        {
          path: 'index.md',
          content: `${home.text}- [Deep Work](deep-work.md)\n`,
        },
      ],
    });
    expect(update.isError).toBe(false);
    expect(sitePaths(siteId)).toEqual(['about.md', 'deep-work.md', 'index.md']);
    expect(content(siteId, 'about.md')).toBe('# About\n');
    expect(content(siteId, 'index.md')).toMatch(/About.*\n.*Deep Work/s);

    // Explicit delete removes exactly that file.
    const del = await call(chat2, 'publish', {
      siteId,
      files: [],
      delete: ['about.md'],
    });
    expect(del.isError).toBe(false);
    expect(del.text).toMatch(/about\.md/);
    expect(sitePaths(siteId)).toEqual(['deep-work.md', 'index.md']);
  });

  it('replaces the whole site only when asked and confirmed', async () => {
    const chat = await connectAs('u1');
    const first = await call(chat, 'publish', {
      files: [
        { path: 'index.md', content: '# Old\n' },
        { path: 'old.md', content: '# Old page\n' },
      ],
    });
    const siteId = first.data?.siteId as string;

    const refused = await call(chat, 'publish', {
      siteId,
      replaceWholeSite: true,
      files: [{ path: 'index.md', content: '# New\n' }],
    });
    expect(refused.isError).toBe(true);
    expect(refused.text).toMatch(/old\.md.*confirmDeleteCount: 1/s);
    expect(sitePaths(siteId)).toEqual(['index.md', 'old.md']);
    expect(content(siteId, 'index.md')).toBe('# Old\n');

    const confirmed = await call(chat, 'publish', {
      siteId,
      replaceWholeSite: true,
      confirmDeleteCount: 1,
      files: [{ path: 'index.md', content: '# New\n' }],
    });
    expect(confirmed.isError).toBe(false);
    expect(sitePaths(siteId)).toEqual(['index.md']);
  });

  it("can't list, read, or change another user's site", async () => {
    const owner = await connectAs('u1');
    const first = await call(owner, 'publish', {
      files: [{ path: 'index.md', content: '# Mine\n' }],
    });
    const siteId = first.data?.siteId as string;

    const other = await connectAs('u2');
    for (const [name, args] of [
      ['list-files', { siteId }],
      ['read-file', { siteId, path: 'index.md' }],
      ['publish', { siteId, files: [], delete: ['index.md'] }],
      ['publish', { siteId, files: [{ path: 'x.md', content: 'x' }] }],
    ] as const) {
      const res = await call(other, name, args);
      expect(res.isError).toBe(true);
      expect(res.text).toMatch(/not (found )?in your account/i);
      expect(res.text).not.toMatch(/Mine/);
    }
    expect(sitePaths(siteId)).toEqual(['index.md']);
    expect(content(siteId, 'index.md')).toBe('# Mine\n');
  });
});
