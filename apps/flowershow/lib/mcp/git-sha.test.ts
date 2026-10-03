import { describe, expect, it } from 'vitest';
import { gitBlobSha } from './git-sha';

describe('gitBlobSha', () => {
  it('matches `git hash-object` for "hello\\n"', () => {
    expect(gitBlobSha(new TextEncoder().encode('hello\n'))).toBe(
      'ce013625030ba8dba906f756967f9e9ca394464a',
    );
  });

  it('handles empty content', () => {
    expect(gitBlobSha(new Uint8Array())).toBe(
      'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391',
    );
  });
});
