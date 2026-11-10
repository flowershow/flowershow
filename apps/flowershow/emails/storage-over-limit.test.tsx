import { render } from '@react-email/components';
import { describe, expect, it } from 'vitest';
import { GB, MB } from '@/lib/entitlements';
import StorageOverLimitEmail, {
  formatStorageSize,
  formatStorageSizes,
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

describe('formatStorageSizes', () => {
  it('shows a decimal when used and limit would round the same', () => {
    expect(formatStorageSizes(200.4 * MB, 200 * MB)).toEqual({
      used: '200.4 MB',
      limit: '200 MB',
    });
  });
  it('rounds used up when still equal', () => {
    expect(formatStorageSizes(200.04 * MB, 200 * MB)).toEqual({
      used: '200.1 MB',
      limit: '200 MB',
    });
  });
  it('handles GB', () => {
    expect(formatStorageSizes(1.04 * GB, GB)).toEqual({
      used: '1.1 GB',
      limit: '1 GB',
    });
  });
  it('leaves normal values alone', () => {
    expect(formatStorageSizes(250 * MB, 200 * MB)).toEqual({
      used: '250 MB',
      limit: '200 MB',
    });
  });
});

describe('grandfathered copy', () => {
  it('says set aside for this site and keeps the Premium pitch under 5 GB', async () => {
    const html = await render(
      <StorageOverLimitEmail
        {...base}
        scope="site"
        isPremium={false}
        grandfathered
        usedBytes={600 * MB}
        limitBytes={500 * MB}
      />,
    );
    expect(html).toContain('the 500 MB set aside for this site');
    expect(html).not.toContain('included with the Free plan');
    expect(html).toContain('Premium gives it 5 GB');
  });
  it('drops the Premium line and button at 5 GB or more', async () => {
    const html = await render(
      <StorageOverLimitEmail
        {...base}
        scope="site"
        isPremium={false}
        grandfathered
        usedBytes={6 * GB}
        limitBytes={5.5 * GB}
      />,
    );
    expect(html).toContain('set aside for this site');
    expect(html).not.toContain('Premium gives it');
    expect(html).not.toContain(base.upgradeUrl);
    expect(html).toContain('just reply to this email');
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
    expect(html).toContain('Ola &amp; Rufus');
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
