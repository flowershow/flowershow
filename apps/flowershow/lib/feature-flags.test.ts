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
