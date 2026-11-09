import { render } from '@react-email/components';
import { describe, expect, it } from 'vitest';
import { GB, MB } from '@/lib/entitlements';
import StorageOverLimitEmail, {
  formatStorageSize,
  storageOverLimitSubject,
} from './storage-over-limit';

const base = {
  userName: 'Ada',
  siteName: 'notes',
  usedBytes: 250 * MB,
  limitBytes: 200 * MB,
  upgradeUrl: 'https://cloud.example.com/site/s1/settings#billing',
};

describe('formatStorageSize', () => {
  it('formats MB and GB', () => {
    expect(formatStorageSize(250 * MB)).toBe('250 MB');
    expect(formatStorageSize(1.5 * GB)).toBe('1.5 GB');
    expect(formatStorageSize(GB)).toBe('1 GB');
    expect(formatStorageSize(10 * GB)).toBe('10 GB');
  });
});

describe('StorageOverLimitEmail', () => {
  it('renders the Free site variant', async () => {
    const html = await render(
      <StorageOverLimitEmail {...base} scope="site" isPremium={false} />,
    );
    expect(html).toContain('250 MB');
    expect(html).toContain('200 MB');
    expect(html).toContain('Nothing has changed for your site');
    expect(html).toContain('Premium gives it 5 GB');
    expect(html).toContain('Upgrade notes');
    expect(html).toContain(base.upgradeUrl);
    expect(html).toContain('The Flowershow team');
    expect(html).not.toMatch(/\$\d/);
  });

  it('renders the Free pool variant', async () => {
    const html = await render(
      <StorageOverLimitEmail
        {...base}
        scope="pool"
        isPremium={false}
        usedBytes={1.5 * GB}
        limitBytes={GB}
        upgradeUrl="https://cloud.example.com"
      />,
    );
    expect(html).toContain('Together, your free sites');
    expect(html).toContain('1.5 GB');
    expect(html).toContain('Nothing has changed for your sites');
    expect(html).toContain('See your sites');
    expect(html).toContain('https://cloud.example.com');
  });

  it('renders the Premium variant without a button', async () => {
    const html = await render(
      <StorageOverLimitEmail
        {...base}
        scope="site"
        isPremium
        usedBytes={11 * GB}
        limitBytes={10 * GB}
        upgradeUrl={undefined}
      />,
    );
    expect(html).toContain('Thanks for being on Premium');
    expect(html).toContain('Nothing has changed for your site');
    expect(html).not.toContain('cloud.example.com');
    expect(html).not.toContain('Upgrade');
  });
});

describe('storageOverLimitSubject', () => {
  it('has a subject per variant', () => {
    expect(
      storageOverLimitSubject({
        scope: 'site',
        isPremium: false,
        siteName: 'n',
      }),
    ).toBe('n has grown past the Free plan');
    expect(
      storageOverLimitSubject({
        scope: 'pool',
        isPremium: false,
        siteName: 'n',
      }),
    ).toBe('Your Flowershow sites have grown past the Free plan');
    expect(
      storageOverLimitSubject({
        scope: 'site',
        isPremium: true,
        siteName: 'n',
      }),
    ).toBe('n is using a lot of storage');
  });
});
