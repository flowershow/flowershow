import { describe, expect, it } from 'vitest';
import { assertLocalDatabase, TEST_ENV_USERS } from './seed';

describe('assertLocalDatabase', () => {
  it.each([
    'postgresql://postgres:postgres@localhost:5432/flowershow-dev',
    'postgresql://postgres:postgres@127.0.0.1:5432/flowershow-dev',
  ])('accepts %s', (url) => {
    expect(() => assertLocalDatabase(url)).not.toThrow();
  });

  it.each([
    'postgresql://u:p@ep-cool-name.eu-central-1.aws.neon.tech/neondb',
    'postgresql://u:p@localhost.evil.example/db',
  ])('refuses %s', (url) => {
    expect(() => assertLocalDatabase(url)).toThrow(/non-local/);
  });

  it('refuses a missing url', () => {
    expect(() => assertLocalDatabase(undefined)).toThrow(/not set/);
  });
});

describe('TEST_ENV_USERS', () => {
  it('keeps every seeded username under the te- prefix', () => {
    for (const user of TEST_ENV_USERS) {
      expect(user.username).toMatch(/^te-/);
    }
  });

  it('seeds Pro at its allowance, so the picker starts full', () => {
    const pro = TEST_ENV_USERS.find((u) => u.username === 'te-pro')!;
    const covered = pro.sites.filter((s) => s.coveredByAccountPlan).length;
    expect(covered).toBe(pro.account!.siteAllowance);
  });
});
