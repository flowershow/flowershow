import { describe, expect, it } from 'vitest';
import { flowershowUmamiAttrs } from './flowershow-analytics';

const opts = {
  host: 'https://u.example',
  websiteId: 'w1',
  vercelEnv: 'production',
};
const site = { id: 's1', privacyMode: 'PUBLIC' };

describe('flowershowUmamiAttrs', () => {
  it('returns the tagged script attributes for a public site in production', () => {
    expect(flowershowUmamiAttrs(site, opts)).toEqual({
      src: 'https://u.example/script.js',
      'data-website-id': 'w1',
      'data-tag': 's1',
      'data-exclude-search': 'true',
      'data-exclude-hash': 'true',
    });
  });

  it('is null for password-protected sites', () => {
    expect(
      flowershowUmamiAttrs({ id: 's1', privacyMode: 'PASSWORD' }, opts),
    ).toBeNull();
  });

  it('is null outside production', () => {
    expect(
      flowershowUmamiAttrs(site, { ...opts, vercelEnv: 'preview' }),
    ).toBeNull();
    expect(
      flowershowUmamiAttrs(site, { ...opts, vercelEnv: undefined }),
    ).toBeNull();
  });

  it('is null when host or website id is empty', () => {
    expect(flowershowUmamiAttrs(site, { ...opts, host: '' })).toBeNull();
    expect(flowershowUmamiAttrs(site, { ...opts, websiteId: '' })).toBeNull();
  });
});
