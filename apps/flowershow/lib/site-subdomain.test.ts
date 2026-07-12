import { describe, expect, it } from 'vitest';

import {
  buildAnonSiteSubdomain,
  buildSiteSubdomain,
  sanitizeSubdomain,
} from './site-subdomain';

describe('sanitizeSubdomain', () => {
  it('lowercases and replaces invalid chars with hyphens', () => {
    expect(sanitizeSubdomain('My Notes')).toBe('my-notes');
  });

  it('collapses consecutive hyphens and strips leading/trailing', () => {
    expect(sanitizeSubdomain('--a--b--')).toBe('a-b');
  });

  it('returns empty string when nothing valid remains', () => {
    expect(sanitizeSubdomain('---')).toBe('');
    expect(sanitizeSubdomain('   ')).toBe('');
    expect(sanitizeSubdomain('!!!')).toBe('');
  });
});

describe('buildSiteSubdomain', () => {
  it('builds {projectName}-{username}', () => {
    expect(buildSiteSubdomain('my-notes', 'alice')).toBe('my-notes-alice');
  });

  // Regression: a projectName that sanitizes to nothing must NOT collapse the
  // subdomain down to just the bare username (which would let a user squat on
  // <username>.flowershow.me). Such a name has no valid label and is rejected.
  it('rejects a projectName that sanitizes to empty (all hyphens)', () => {
    expect(() => buildSiteSubdomain('---', 'alice')).toThrow();
  });

  it('rejects a projectName of only invalid characters', () => {
    expect(() => buildSiteSubdomain('   ', 'alice')).toThrow();
    expect(() => buildSiteSubdomain('!!!', 'alice')).toThrow();
  });

  it('never produces a subdomain equal to the bare username', () => {
    for (const raw of ['-', '--', '---', ' ', '!', '.']) {
      let out: string | null = null;
      try {
        out = buildSiteSubdomain(raw, 'alice');
      } catch {
        out = null; // rejected — acceptable
      }
      expect(out).not.toBe('alice');
    }
  });

  it('always includes the username suffix for valid names', () => {
    expect(buildSiteSubdomain('a', 'alice')).toBe('a-alice');
    expect(buildSiteSubdomain('My.Notes', 'alice')).toBe('my-notes-alice');
  });
});

describe('buildAnonSiteSubdomain', () => {
  it('builds {projectName}-anon', () => {
    expect(buildAnonSiteSubdomain('abc123')).toBe('abc123-anon');
  });

  it('rejects a projectName that sanitizes to empty', () => {
    expect(() => buildAnonSiteSubdomain('---')).toThrow();
  });
});
