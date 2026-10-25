import { describe, expect, it } from 'vitest';
import { displayDescription } from './page-description';

describe('displayDescription', () => {
  it('returns an author-written description', () => {
    expect(displayDescription({ description: 'Mine' })).toBe('Mine');
  });
  it('hides a computed description', () => {
    expect(
      displayDescription({ description: 'Auto', computed: ['description'] }),
    ).toBeUndefined();
  });
  it('still shows the description when only the title was computed', () => {
    expect(
      displayDescription({ description: 'Mine', computed: ['title'] }),
    ).toBe('Mine');
  });
  it('handles missing metadata and non-string values', () => {
    expect(displayDescription(null)).toBeUndefined();
    expect(displayDescription({ description: 42 as unknown as string })).toBe(
      '42',
    );
    // An unfilled `description: {{description}}` is a YAML map, not text
    expect(
      displayDescription({
        description: { '{ description }': null } as unknown as string,
      }),
    ).toBeUndefined();
  });
});
