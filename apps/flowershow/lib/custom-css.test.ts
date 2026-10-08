import { describe, expect, it } from 'vitest';
import {
  CUSTOM_CSS_PATH,
  customCssCacheControl,
  customCssHref,
  customCssVersion,
  etagMatches,
  usesGoogleFonts,
} from './custom-css';

describe('customCssVersion', () => {
  it('is a 16-char hex digest of the content', () => {
    expect(customCssVersion('body { color: red }')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is stable for the same content and changes with it', () => {
    const a = customCssVersion('a { color: red }');
    expect(customCssVersion('a { color: red }')).toBe(a);
    expect(customCssVersion('a { color: blue }')).not.toBe(a);
  });
});

describe('usesGoogleFonts', () => {
  it('detects a Google Fonts import (case-insensitive)', () => {
    expect(
      usesGoogleFonts(
        "@import url('https://Fonts.GoogleAPIs.com/css2?family=Inter');",
      ),
    ).toBe(true);
  });

  it('is false for CSS without Google Fonts', () => {
    expect(usesGoogleFonts('body { font-family: serif }')).toBe(false);
  });
});

describe('customCssHref', () => {
  it('is a root-relative, versioned URL at the source file path', () => {
    expect(CUSTOM_CSS_PATH).toBe('custom.css');
    expect(customCssHref('abc123')).toBe('/custom.css?v=abc123');
  });

  it('is unversioned when the version is unknown', () => {
    expect(customCssHref(null)).toBe('/custom.css');
    expect(customCssHref(undefined)).toBe('/custom.css');
  });
});

describe('customCssCacheControl', () => {
  const now = new Date('2026-10-08T00:00:00Z');

  it('is immutable for a year when the requested version matches', () => {
    expect(
      customCssCacheControl({ versionMatches: true, isPrivate: false, now }),
    ).toBe('public, max-age=31536000, immutable');
  });

  it('is private for password-protected sites', () => {
    expect(
      customCssCacheControl({ versionMatches: true, isPrivate: true, now }),
    ).toBe('private, max-age=31536000, immutable');
    expect(
      customCssCacheControl({ versionMatches: false, isPrivate: true, now }),
    ).toBe('private, max-age=0, must-revalidate');
  });

  it('must revalidate when the version is missing or stale', () => {
    expect(
      customCssCacheControl({ versionMatches: false, isPrivate: false, now }),
    ).toBe('public, max-age=0, must-revalidate');
  });

  it('caps max-age at the time left before an expiring site expires', () => {
    expect(
      customCssCacheControl({
        versionMatches: true,
        isPrivate: false,
        expiresAt: new Date(now.getTime() + 90_500),
        now,
      }),
    ).toBe('public, max-age=90, immutable');
  });

  it('must revalidate when an expiring site has no time left', () => {
    expect(
      customCssCacheControl({
        versionMatches: true,
        isPrivate: false,
        expiresAt: new Date(now.getTime() + 500),
        now,
      }),
    ).toBe('public, max-age=0, must-revalidate');
    expect(
      customCssCacheControl({
        versionMatches: true,
        isPrivate: false,
        expiresAt: new Date(now.getTime() - 5000),
        now,
      }),
    ).toBe('public, max-age=0, must-revalidate');
  });
});

describe('etagMatches', () => {
  it('matches the quoted ETag, weak ETags, lists and *', () => {
    expect(etagMatches('"abc"', 'abc')).toBe(true);
    expect(etagMatches('W/"abc"', 'abc')).toBe(true);
    expect(etagMatches('"x", "abc"', 'abc')).toBe(true);
    expect(etagMatches('*', 'abc')).toBe(true);
  });

  it('does not match a different or missing ETag', () => {
    expect(etagMatches('"abd"', 'abc')).toBe(false);
    expect(etagMatches(null, 'abc')).toBe(false);
    expect(etagMatches('', 'abc')).toBe(false);
  });
});
