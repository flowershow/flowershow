import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';

// ---------------------------------------------------------------------------
// HTTP integration tests for the /mcp endpoint
// ---------------------------------------------------------------------------

describe('POST /mcp endpoint', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Use a non-existent API URL — we only test the auth gate here,
    // not actual API calls (those are tested in sites.test.ts).
    const app = createApp('http://localhost:0');
    server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });

    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('returns 401 JSON-RPC error when Authorization header is missing', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
      }),
    });

    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: expect.stringContaining('Missing Authorization header'),
      },
      id: null,
    });
  });

  it('logs incoming MCP requests to server stdout', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 99,
      }),
    });

    expect(res.status).toBe(401);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('MCP POST /mcp'),
    );

    infoSpy.mockRestore();
  });

  it('returns 401 when Authorization uses wrong scheme', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic dXNlcjpwYXNz',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
      }),
    });

    expect(res.status).toBe(401);
  });

  it('accepts valid Bearer auth and processes MCP initialize', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer fs_pat_test123',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '0.0.1' },
        },
        id: 1,
      }),
    });

    // Should get a successful MCP response (200), not 401
    expect(res.status).toBe(200);

    // The response is SSE when Accept includes text/event-stream.
    // Parse the SSE event to extract the JSON-RPC response.
    const text = await res.text();
    const dataLine = text.split('\n').find((line) => line.startsWith('data: '));
    expect(dataLine).toBeDefined();

    const body = JSON.parse(dataLine!.slice('data: '.length));
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: expect.any(String),
        serverInfo: {
          name: 'flowershow',
          version: '0.1.0',
        },
        capabilities: expect.any(Object),
      },
    });
  });

  it('serves machine-readable MCP tool contract generated from zod schemas', async () => {
    const res = await fetch(`${baseUrl}/mcp/contract`);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toMatchObject({
      server: {
        name: 'flowershow',
        version: '0.1.0',
      },
      tools: expect.any(Array),
    });

    const publishNote = body.tools.find(
      (tool: { name: string }) => tool.name === 'publish-note',
    );
    expect(publishNote).toBeDefined();
    expect(publishNote.inputSchema.properties).toMatchObject({
      siteId: { type: 'string' },
      path: { type: 'string' },
      content: { type: 'string' },
    });

    const planFileUploads = body.tools.find(
      (tool: { name: string }) => tool.name === 'plan-file-uploads',
    );
    expect(planFileUploads).toBeDefined();
    expect(planFileUploads.inputSchema.properties).toMatchObject({
      siteId: { type: 'string' },
      files: { type: 'array' },
    });

    const getPublishStatus = body.tools.find(
      (tool: { name: string }) => tool.name === 'get-publish-status',
    );
    expect(getPublishStatus).toBeDefined();
    expect(getPublishStatus.inputSchema.properties).toMatchObject({
      siteId: { type: 'string' },
    });
  });
});
