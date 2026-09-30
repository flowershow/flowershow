import { describe, expect, it } from 'vitest';
import { validateAnonPublishFiles } from './publish-limits';

const f = (i: number, size = 10) => ({
  path: `p${i}.html`,
  size,
  sha: `s${i}`,
});

describe('validateAnonPublishFiles', () => {
  it('allows HTML-only sets within limits', () => {
    expect(validateAnonPublishFiles([f(1), f(2)])).toBeNull();
  });
  it('rejects more than 200 files', () => {
    expect(
      validateAnonPublishFiles(Array.from({ length: 201 }, (_, i) => f(i)))
        ?.status,
    ).toBe(413);
  });
  it('rejects more than 50 MB total', () => {
    expect(
      validateAnonPublishFiles([f(1, 30 * 1024 * 1024), f(2, 21 * 1024 * 1024)])
        ?.status,
    ).toBe(413);
  });
});
