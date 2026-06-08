import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
}));

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_TYPESENSE_HOST: 'localhost',
    NEXT_PUBLIC_TYPESENSE_PORT: '8108',
    NEXT_PUBLIC_TYPESENSE_PROTOCOL: 'http',
    TYPESENSE_ADMIN_API_KEY: 'test-key',
  },
}));

vi.mock('@/lib/typesense', () => ({
  typesense: {
    collections: () => ({
      documents: () => ({ search: mocks.search }),
    }),
  },
}));

// ── Import after mocks ────────────────────────────────────────────

import { buildPrompt, extractKeywords, retrieveContext } from '../rag';

// ── extractKeywords ───────────────────────────────────────────────

describe('extractKeywords', () => {
  it('strips question and stop words', () => {
    expect(extractKeywords('how do I enable comments?')).toBe(
      'enable comments',
    );
  });

  it('handles multi-word conversational questions', () => {
    expect(extractKeywords('what is the syntax for callouts?')).toBe(
      'syntax callouts',
    );
  });

  it('falls back to original question when nothing survives stripping', () => {
    expect(extractKeywords('how do I?')).toBe('how do I?');
  });

  it('preserves meaningful short words longer than 2 chars', () => {
    expect(extractKeywords('configure nav links')).toBe('configure nav links');
  });
});

// ── retrieveContext ───────────────────────────────────────────────

describe('retrieveContext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends extracted keywords to Typesense, not the raw question', async () => {
    mocks.search.mockResolvedValue({ hits: [] });
    await retrieveContext('site-abc', 'how do I enable comments?');
    expect(mocks.search).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'enable comments' }),
    );
  });

  it('returns mapped documents from hits', async () => {
    mocks.search.mockResolvedValue({
      hits: [
        {
          document: {
            title: 'Getting Started',
            content: 'Install flowershow...',
            path: '/getting-started',
          },
        },
        {
          document: {
            title: 'Config',
            content: 'Configure your site...',
            path: '/config',
          },
        },
      ],
    });

    const docs = await retrieveContext('site-abc', 'how to install');

    expect(docs).toEqual([
      {
        title: 'Getting Started',
        content: 'Install flowershow...',
        path: '/getting-started',
      },
      { title: 'Config', content: 'Configure your site...', path: '/config' },
    ]);
  });

  it('returns empty array when collection does not exist (404)', async () => {
    const err: any = new Error('Not Found');
    err.httpStatus = 404;
    mocks.search.mockRejectedValue(err);

    const docs = await retrieveContext('site-no-search', 'anything');
    expect(docs).toEqual([]);
  });

  it('re-throws non-404 errors', async () => {
    const err: any = new Error('Server Error');
    err.httpStatus = 500;
    mocks.search.mockRejectedValue(err);

    await expect(retrieveContext('site-abc', 'anything')).rejects.toThrow(
      'Server Error',
    );
  });
});

// ── buildPrompt ───────────────────────────────────────────────────

describe('buildPrompt', () => {
  it('places context documents in the system message', () => {
    const docs = [
      { title: 'Intro', content: 'Welcome to flowershow.', path: '/intro' },
    ];
    const { system } = buildPrompt('What is this?', [], docs);

    expect(system).toContain('Intro');
    expect(system).toContain('Welcome to flowershow.');
  });

  it('appends the question as the last user message', () => {
    const { messages } = buildPrompt('Tell me more', [], []);

    const last = messages[messages.length - 1];
    expect(last).toEqual({ role: 'user', content: 'Tell me more' });
  });

  it('preserves conversation history before the new question', () => {
    const history = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ];
    const { messages } = buildPrompt('Follow-up question', history, []);

    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(messages[1]).toEqual({ role: 'assistant', content: 'Hi there!' });
    expect(messages[2]).toEqual({
      role: 'user',
      content: 'Follow-up question',
    });
  });

  it('notes missing context in system message when no documents', () => {
    const { system } = buildPrompt('Anything?', [], []);
    expect(system).toContain('No relevant content found');
  });
});
