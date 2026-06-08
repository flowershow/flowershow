import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  prisma: {
    site: { findUnique: vi.fn() },
  },
  retrieveContext: vi.fn(),
  buildPrompt: vi.fn(),
  stream: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────

vi.mock('@/env.mjs', () => ({ env: {} }));

vi.mock('@/server/db', () => ({ default: mocks.prisma }));

vi.mock('@/lib/rag', () => ({
  retrieveContext: mocks.retrieveContext,
  buildPrompt: mocks.buildPrompt,
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: mocks.stream },
  })),
}));

// ── Import after mocks ────────────────────────────────────────────

import { POST } from '../route';

// ── Helpers ───────────────────────────────────────────────────────

function makeRequest(body: unknown = { question: 'Hello?' }) {
  return new NextRequest('http://localhost/api/sites/id/site-1/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ siteId: 'site-1' });

beforeEach(() => {
  vi.clearAllMocks();

  mocks.retrieveContext.mockResolvedValue([]);
  mocks.buildPrompt.mockReturnValue({ system: 'You are...', messages: [] });

  async function* fakeStream() {
    yield {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Hello' },
    };
  }
  mocks.stream.mockReturnValue(fakeStream());
});

// ── Tests ─────────────────────────────────────────────────────────

describe('POST /api/sites/id/:siteId/chat', () => {
  it('returns 404 for unknown siteId', async () => {
    mocks.prisma.site.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(404);
  });

  it('returns 403 when enableAiChat is false', async () => {
    mocks.prisma.site.findUnique.mockResolvedValue({
      enableAiChat: false,
      aiChatApiKey: null,
    });

    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(403);
  });

  it('returns 503 when enableAiChat is true but apiKey is missing', async () => {
    mocks.prisma.site.findUnique.mockResolvedValue({
      enableAiChat: true,
      aiChatApiKey: null,
    });

    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(503);
  });

  it('returns a streaming response for a valid request', async () => {
    mocks.prisma.site.findUnique.mockResolvedValue({
      enableAiChat: true,
      aiChatApiKey: 'sk-ant-test',
    });

    const res = await POST(makeRequest(), { params });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.body).not.toBeNull();
  });

  it('streams tokens and a final sources event', async () => {
    mocks.prisma.site.findUnique.mockResolvedValue({
      enableAiChat: true,
      aiChatApiKey: 'sk-ant-test',
    });
    mocks.retrieveContext.mockResolvedValue([
      { title: 'Page', content: 'Content', path: '/page' },
    ]);

    async function* fakeStream() {
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Hi' },
      };
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: '!' },
      };
    }
    mocks.stream.mockReturnValue(fakeStream());

    const res = await POST(makeRequest(), { params });
    const text = await new Response(res.body).text();

    expect(text).toContain(JSON.stringify({ type: 'token', content: 'Hi' }));
    expect(text).toContain(JSON.stringify({ type: 'token', content: '!' }));
    expect(text).toContain(
      JSON.stringify({ type: 'sources', paths: ['/page'] }),
    );
  });
});
