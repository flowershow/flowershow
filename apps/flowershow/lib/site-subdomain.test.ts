import { describe, expect, it, vi } from 'vitest';
import { buildSubdomain, ensureUniqueSubdomain } from './site-subdomain';

describe('buildSubdomain', () => {
  it('lowercases and hyphenates invalid characters', () => {
    expect(buildSubdomain('My Notes')).toBe('my-notes');
  });

  it('collapses consecutive hyphens and trims edges', () => {
    expect(buildSubdomain('  !!My   Notes!!  ')).toBe('my-notes');
  });

  it('transliterates non-Latin scripts to an ASCII label', () => {
    expect(buildSubdomain('База знаний')).toBe('baza-znaniy');
    expect(buildSubdomain('Café')).toBe('cafe');
  });

  it('joins multiple parts into a single slug', () => {
    expect(buildSubdomain('My Notes', 'olayway')).toBe('my-notes-olayway');
  });

  it('keeps the label non-empty via the suffix when the name has no slug content', () => {
    // Name transliterates to nothing usable; the username suffix carries it.
    expect(buildSubdomain('🎉', 'olayway')).toBe('olayway');
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
    const base = buildSubdomain('My Notes', 'ola'); // my-notes-ola
    const taken = new Set<string>();
    const exists = vi.fn(async (s: string) => taken.has(s));

    const first = await ensureUniqueSubdomain(base, exists);
    taken.add(first);
    const second = await ensureUniqueSubdomain(
      buildSubdomain('my notes', 'ola'),
      exists,
    );

    expect(first).toBe('my-notes-ola');
    expect(second).toBe('my-notes-ola-2');
  });
});
