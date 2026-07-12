import { describe, expect, it } from 'vitest';
import { SITE_NAME_MAX_LENGTH, validateSiteName } from './validate-site-name';
import { sanitizeSubdomain } from './site-subdomain';

describe('validateSiteName', () => {
  it('accepts a plain name and returns it unchanged', () => {
    expect(validateSiteName('My Notes')).toEqual({
      ok: true,
      name: 'My Notes',
    });
  });

  it('preserves case and spaces (the name is stored raw)', () => {
    const result = validateSiteName('My Notes');
    expect(result).toEqual({ ok: true, name: 'My Notes' });
  });

  it('trims surrounding whitespace', () => {
    expect(validateSiteName('  My Notes  ')).toEqual({
      ok: true,
      name: 'My Notes',
    });
  });

  it('rejects an empty string', () => {
    expect(validateSiteName('').ok).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    expect(validateSiteName('   ').ok).toBe(false);
  });

  it('rejects a name longer than the max length', () => {
    expect(validateSiteName('a'.repeat(SITE_NAME_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
  });

  it('accepts a name exactly at the max length', () => {
    expect(validateSiteName('a'.repeat(SITE_NAME_MAX_LENGTH)).ok).toBe(true);
  });

  it('rejects an all-symbol name (would collapse to an empty subdomain)', () => {
    expect(validateSiteName('!!!___...').ok).toBe(false);
  });

  it('rejects a name whose only letters are non-ASCII (subdomain would be empty)', () => {
    // Cyrillic-only — sanitizeSubdomain keeps only [a-z0-9], so this must fail.
    expect(validateSiteName('Привет').ok).toBe(false);
  });

  it('rejects a name containing a slash', () => {
    expect(validateSiteName('foo/bar').ok).toBe(false);
  });

  it('rejects a name containing control characters', () => {
    const withTab = `foo${String.fromCharCode(9)}bar`;
    expect(validateSiteName(withTab).ok).toBe(false);
  });

  it('accepts a name mixing letters, digits, spaces and punctuation', () => {
    expect(validateSiteName('Season 2024 — recap!')).toEqual({
      ok: true,
      name: 'Season 2024 — recap!',
    });
  });

  // The core guarantee this validator exists to provide: any accepted name
  // yields a non-empty subdomain.
  it('every accepted name produces a non-empty subdomain', () => {
    const candidates = [
      'My Notes',
      'a',
      '2024',
      'Season 2024 — recap!',
      '   trimmed   ',
      'ünïcode with 1 ascii digit',
    ];
    for (const raw of candidates) {
      const result = validateSiteName(raw);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(
          sanitizeSubdomain(`${result.name}-someuser`).length,
        ).toBeGreaterThan(0);
      }
    }
  });
});
