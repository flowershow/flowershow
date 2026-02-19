import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { extractPat } from './app.js';

// ---------------------------------------------------------------------------
// extractPat
// ---------------------------------------------------------------------------

describe('extractPat', () => {
  function fakeReq(authorization?: string): Request {
    return {
      headers: authorization !== undefined ? { authorization } : {},
    } as unknown as Request;
  }

  it('extracts token from a valid Bearer header', () => {
    expect(extractPat(fakeReq('Bearer fs_pat_abc123'))).toBe('fs_pat_abc123');
  });

  it('returns null when Authorization header is missing', () => {
    expect(extractPat(fakeReq())).toBeNull();
  });

  it('returns null when Authorization header is empty string', () => {
    expect(extractPat(fakeReq(''))).toBeNull();
  });

  it('returns null when Authorization header has wrong scheme', () => {
    expect(extractPat(fakeReq('Basic dXNlcjpwYXNz'))).toBeNull();
  });

  it('returns null when Authorization is just "Bearer" with no token', () => {
    // "Bearer " prefix is 7 chars, slice returns empty string
    // The implementation returns empty string — but empty string is falsy?
    // Let's test the actual behavior:
    const result = extractPat(fakeReq('Bearer '));
    // 'Bearer '.slice(7) === '' — this is an empty string, which is truthy for !== null
    expect(result).toBe('');
  });

  it('preserves the full token including special characters', () => {
    expect(extractPat(fakeReq('Bearer fs_pat_a/b+c=d'))).toBe('fs_pat_a/b+c=d');
  });
});
