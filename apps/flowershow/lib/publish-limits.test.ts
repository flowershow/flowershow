import { describe, expect, it } from 'vitest';
import {
  validateAnonPublishFiles,
  validatePublishFiles,
} from './publish-limits';

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

describe('file size validation (both paths)', () => {
  const MB = 1024 * 1024;
  it.each([
    ['negative', -1],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['NaN', Number.NaN],
  ])('rejects a %s size with 400', (_label, size) => {
    const files = [f(1), f(2, size)];
    expect(validatePublishFiles(files)?.status).toBe(400);
    expect(validateAnonPublishFiles(files)?.status).toBe(400);
  });
  it('cannot use a negative size to get under the anonymous 50 MB total', () => {
    const files = [f(1, 49 * MB), f(2, 49 * MB), f(3, -60 * MB)];
    const res = validateAnonPublishFiles(files);
    expect(res).not.toBeNull();
    expect([400, 413]).toContain(res?.status);
  });
});
