import { describe, expect, it, vi } from 'vitest';
import {
  buildSiteSubdomain,
  ensureUniqueSubdomain,
  sanitizeSubdomain,
} from './site-subdomain';

describe('sanitizeSubdomain', () => {
  it('lowercases and hyphenates invalid characters', () => {
    expect(sanitizeSubdomain('My Notes')).toBe('my-notes');
  });

  it('collapses consecutive hyphens and trims edges', () => {
    expect(sanitizeSubdomain('  !!My   Notes!!  ')).toBe('my-notes');
  });
});

describe('buildSiteSubdomain', () => {
  it('joins name and username into a single slug', () => {
    expect(buildSiteSubdomain('My Notes', 'olayway')).toBe('my-notes-olayway');
  });
});

describe('ensureUniqueSubdomain', () => {
  it('returns the base when it is free', async () => {
    const exists = vi.fn().mockResolvedValue(false);
    expect(await ensureUniqueSubdomain('my-notes-ola', exists)).toBe(
      'my-notes-ola',
    );
    expect(exists).toHaveBeenCalledExactlyOnceWith('my-notes-ola');
  });

  it('appends -2 on the first collision', async () => {
    const taken = new Set(['my-notes-ola']);
    const exists = vi.fn(async (s: string) => taken.has(s));
    expect(await ensureUniqueSubdomain('my-notes-ola', exists)).toBe(
      'my-notes-ola-2',
    );
  });

  it('keeps incrementing until a free subdomain is found', async () => {
    const taken = new Set(['my-notes-ola', 'my-notes-ola-2', 'my-notes-ola-3']);
    const exists = vi.fn(async (s: string) => taken.has(s));
    expect(await ensureUniqueSubdomain('my-notes-ola', exists)).toBe(
      'my-notes-ola-4',
    );
  });

  it('resolves two slug-colliding names to distinct subdomains', async () => {
    // "My Notes" and "my notes" both build the same base.
    const base = buildSiteSubdomain('My Notes', 'ola'); // my-notes-ola
    const taken = new Set<string>();
    const exists = vi.fn(async (s: string) => taken.has(s));

    const first = await ensureUniqueSubdomain(base, exists);
    taken.add(first);
    const second = await ensureUniqueSubdomain(
      buildSiteSubdomain('my notes', 'ola'),
      exists,
    );

    expect(first).toBe('my-notes-ola');
    expect(second).toBe('my-notes-ola-2');
  });
});
