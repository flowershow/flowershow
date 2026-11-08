import { describe, expect, it } from 'vitest';
import { readApiError } from './api-error';

describe('readApiError', () => {
  it('returns the message from the JSON body', async () => {
    const res = new Response(
      JSON.stringify({ error: 'storage_limit_exceeded', message: 'Too big' }),
      { status: 413 },
    );
    expect(await readApiError(res, 'fallback')).toBe('Too big');
  });

  it('falls back when the body is not JSON', async () => {
    expect(await readApiError(new Response('oops'), 'fallback')).toBe(
      'fallback',
    );
  });

  it('falls back when the body has no message', async () => {
    expect(await readApiError(new Response('{}'), 'fallback')).toBe('fallback');
  });
});
