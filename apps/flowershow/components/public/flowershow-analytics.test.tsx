import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const scriptProps = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('next/script', () => ({
  default: (props: unknown) => {
    scriptProps.current = props;
    return null;
  },
}));
vi.mock('@/env.mjs', () => ({
  env: { NEXT_PUBLIC_VERCEL_ENV: 'production' },
}));
vi.mock('@/lib/site-analytics/config', () => ({
  UMAMI_HOST: 'https://u.example',
  UMAMI_WEBSITE_ID: 'w1',
}));

import {
  FlowershowAnalytics,
  flowershowUmamiAttrs,
} from './flowershow-analytics';

describe('FlowershowAnalytics', () => {
  it('loads lazily and deferred, so an owner’s own Umami claims window.umami first', () => {
    render(<FlowershowAnalytics site={{ id: 's1', privacyMode: 'PUBLIC' }} />);
    expect(scriptProps.current).toMatchObject({
      strategy: 'lazyOnload',
      defer: true,
      src: 'https://u.example/script.js',
      'data-tag': 's1',
    });
  });
});

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
