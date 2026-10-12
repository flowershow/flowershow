import { describe, expect, it } from 'vitest';
import { isDraft } from './draft';

describe('isDraft', () => {
  it('is true for draft: true and the string "true" in any case', () => {
    expect(isDraft({ draft: true })).toBe(true);
    expect(isDraft({ draft: 'true' })).toBe(true);
    expect(isDraft({ draft: ' True ' })).toBe(true);
  });

  it('is false otherwise', () => {
    expect(isDraft({ draft: false })).toBe(false);
    expect(isDraft({ draft: 'false' })).toBe(false);
    expect(isDraft({ draft: 'yes' })).toBe(false);
    expect(isDraft({})).toBe(false);
    expect(isDraft(null)).toBe(false);
    expect(isDraft(undefined)).toBe(false);
    expect(isDraft('draft')).toBe(false);
  });
});
