import { describe, expect, it } from 'vitest';
import { ownerSectionVisibility } from './settings-sections';

describe('ownerSectionVisibility', () => {
  it('shows Billing and Danger Zone to owners regardless of subscription', () => {
    expect(ownerSectionVisibility('owner')).toEqual({
      billing: true,
      danger: true,
    });
  });
  it('shows neither to editors', () => {
    expect(ownerSectionVisibility('editor')).toEqual({
      billing: false,
      danger: false,
    });
  });
});
