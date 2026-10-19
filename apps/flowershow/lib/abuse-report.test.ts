import { describe, expect, it } from 'vitest';
import { abuseReportSchema, reportedSiteLookup } from './abuse-report';

// NEXT_PUBLIC_SITE_DOMAIN is test.localhost in vitest.setup.ts
describe('reportedSiteLookup', () => {
  it('maps a site URL to its subdomain', () => {
    expect(
      reportedSiteLookup('https://Foo-Anon.test.localhost/x.html'),
    ).toEqual({ subdomain: 'foo-anon' });
  });
  it('accepts a bare host', () => {
    expect(reportedSiteLookup('foo-anon.test.localhost')).toEqual({
      subdomain: 'foo-anon',
    });
  });
  it('treats other hosts as custom domains', () => {
    expect(reportedSiteLookup('https://docs.example.com/')).toEqual({
      customDomain: 'docs.example.com',
    });
  });
  it('rejects the bare site domain and junk', () => {
    expect(reportedSiteLookup('https://test.localhost/')).toBeNull();
    expect(reportedSiteLookup('http://')).toBeNull();
  });
});

describe('abuseReportSchema', () => {
  it('requires a url and a known reason', () => {
    expect(
      abuseReportSchema.safeParse({ url: '', reason: 'spam' }).success,
    ).toBe(false);
    expect(
      abuseReportSchema.safeParse({ url: 'https://a', reason: 'nope' }).success,
    ).toBe(false);
    expect(
      abuseReportSchema.safeParse({ url: 'https://a', reason: 'phishing' })
        .success,
    ).toBe(true);
  });
  it('allows an empty email but rejects an invalid one', () => {
    const base = { url: 'https://a', reason: 'spam' };
    expect(abuseReportSchema.safeParse({ ...base, email: '' }).success).toBe(
      true,
    );
    expect(
      abuseReportSchema.safeParse({ ...base, email: 'not-an-email' }).success,
    ).toBe(false);
  });
});
