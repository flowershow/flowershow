import { describe, expect, it } from 'vitest';

import { OFFICIAL_THEMES } from './themes';

describe('OFFICIAL_THEMES', () => {
  it('exposes every dashboard theme with its stable config value', () => {
    expect(OFFICIAL_THEMES).toEqual([
      { value: 'letterpress', label: 'Letterpress' },
      { value: 'superstack', label: 'Superstack' },
      { value: 'lessflowery', label: 'Lessflowery' },
      { value: 'leaf', label: 'Leaf' },
      { value: 'monospace', label: 'Monospace' },
    ]);
  });
});
