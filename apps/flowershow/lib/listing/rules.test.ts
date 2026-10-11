// lib/listing/rules.test.ts
import { describe, expect, it } from 'vitest';
import { isDraft, isUnpublished } from './rules';

describe('rules', () => {
  it('isDraft accepts true and "true" only', () => {
    expect(isDraft({ draft: true })).toBe(true);
    expect(isDraft({ draft: 'True ' })).toBe(true);
    expect(isDraft({ draft: false })).toBe(false);
    expect(isDraft({ draft: 'yes' })).toBe(false);
    expect(isDraft(null)).toBe(false);
  });
  it('isUnpublished mirrors the page route (publish === false)', () => {
    expect(isUnpublished({ publish: false })).toBe(true);
    expect(isUnpublished({ publish: 'false' })).toBe(false);
  });
});
