import { Plan } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { Feature, isFeatureEnabled } from './feature-flags';

describe('isFeatureEnabled(Feature.PageScripts)', () => {
  it('is enabled on the Premium plan', () => {
    expect(
      isFeatureEnabled(Feature.PageScripts, {
        customDomain: null,
        plan: Plan.PREMIUM,
      }),
    ).toBe(true);
  });

  it.each([Plan.FREE, null, undefined])('is disabled for plan %s', (plan) => {
    expect(
      isFeatureEnabled(Feature.PageScripts, { customDomain: null, plan }),
    ).toBe(false);
  });
});

describe('isFeatureEnabled(CustomFooter)', () => {
  it('is enabled on Premium sites', () => {
    expect(
      isFeatureEnabled(Feature.CustomFooter, {
        customDomain: null,
        plan: 'PREMIUM',
      }),
    ).toBe(true);
  });

  it('is disabled on Free sites', () => {
    expect(
      isFeatureEnabled(Feature.CustomFooter, {
        customDomain: null,
        plan: 'FREE',
      }),
    ).toBe(false);
  });

  it('is disabled when the plan is unknown (e.g. withheld for protected sites)', () => {
    expect(isFeatureEnabled(Feature.CustomFooter, { customDomain: null })).toBe(
      false,
    );
  });
});
