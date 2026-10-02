import { describe, expect, it } from 'vitest';
import { resolveAuthRedirect } from './auth-redirect';

const baseUrl = 'https://cloud.flowershow.app';
const allowedHosts = [
  'flowershow.app',
  'cloud.flowershow.app',
  'my.flowershow.app',
];
const resolve = (url: string) =>
  resolveAuthRedirect({ url, baseUrl, allowedHosts });

describe('resolveAuthRedirect', () => {
  it('allows same-origin and relative URLs', () => {
    expect(resolve('https://cloud.flowershow.app/sites')).toBe(
      'https://cloud.flowershow.app/sites',
    );
    expect(resolve('/cli/verify?code=x')).toBe(
      'https://cloud.flowershow.app/cli/verify?code=x',
    );
  });

  it('allows the first-party hosts (claim flow returns to the apex)', () => {
    expect(resolve('https://flowershow.app/claim?siteId=s1')).toBe(
      'https://flowershow.app/claim?siteId=s1',
    );
    expect(resolve('https://my.flowershow.app/x')).toBe(
      'https://my.flowershow.app/x',
    );
  });

  it('rejects other subdomains of the home domain (user content hosts)', () => {
    expect(resolve('https://r2.flowershow.app/site/main/raw/x.svg')).toBe(
      baseUrl,
    );
    expect(resolve('https://evil.flowershow.app/')).toBe(baseUrl);
  });

  it('rejects foreign and look-alike hosts', () => {
    expect(resolve('https://evil.com/')).toBe(baseUrl);
    expect(resolve('https://flowershow.app.evil.com/')).toBe(baseUrl);
    expect(resolve('//evil.com/x')).toBe(baseUrl);
  });

  it('matches hosts including the port', () => {
    expect(
      resolveAuthRedirect({
        url: 'http://flowershow.local:3000/claim',
        baseUrl: 'http://cloud.flowershow.local:3000',
        allowedHosts: ['flowershow.local:3000'],
      }),
    ).toBe('http://flowershow.local:3000/claim');
  });
});
