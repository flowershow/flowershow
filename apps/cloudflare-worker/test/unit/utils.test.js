import { describe, expect, it } from 'vitest';
import { resolveTargetToBlob } from '../../src/utils.js';

const blobs = [
  { id: '1', permalink: '/custom', app_path: '/blog/post', path: '/blog/post.md' },
  { id: '2', permalink: null, app_path: '/docs/guide', path: '/docs/guide.md' },
  { id: '3', permalink: null, app_path: null, path: '/assets/image.png' },
];

describe('resolveTargetToBlob', () => {
  it('matches by permalink', () => {
    expect(resolveTargetToBlob('/custom', blobs)).toBe(blobs[0]);
  });

  it('matches by app_path', () => {
    expect(resolveTargetToBlob('/blog/post', blobs)).toBe(blobs[0]);
  });

  it('matches by exact path', () => {
    expect(resolveTargetToBlob('/blog/post.md', blobs)).toBe(blobs[0]);
  });

  it('matches by suffix path', () => {
    expect(resolveTargetToBlob('blog/post.md', blobs)).toBe(blobs[0]);
  });

  it('matches by suffix path with .md appended', () => {
    expect(resolveTargetToBlob('docs/guide', blobs)).toBe(blobs[1]);
  });

  it('matches by suffix path with .mdx appended', () => {
    const mdxBlobs = [{ id: '4', permalink: null, app_path: '/page', path: '/page.mdx' }];
    expect(resolveTargetToBlob('page', mdxBlobs)).toBe(mdxBlobs[0]);
  });

  it('returns null when no match', () => {
    expect(resolveTargetToBlob('nonexistent', blobs)).toBeNull();
  });
});
