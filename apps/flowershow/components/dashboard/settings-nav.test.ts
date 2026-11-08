import { describe, expect, it } from 'vitest';
import { navSectionsFor } from './settings-nav';

describe('navSectionsFor', () => {
  it('hides owner-only sections from editors', () => {
    expect(navSectionsFor(false).map((s) => s.id)).toEqual([
      'general',
      'appearance',
      'navigation',
      'content',
      'features',
      'analytics',
      'access',
    ]);
  });
  it('shows every section to the owner', () => {
    expect(navSectionsFor(true).map((s) => s.id)).toContain('billing');
    expect(navSectionsFor(true).map((s) => s.id)).toContain('danger');
    expect(navSectionsFor(true).map((s) => s.id)).toContain('github');
  });
});
