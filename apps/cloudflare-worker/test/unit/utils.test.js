import { matchLinkTarget } from '@flowershow/core';
import { describe, expect, it } from 'vitest';

const blobs = [
  { id: '1', path: '/blog/post.md' },
  { id: '2', path: '/docs/guide.md' },
  { id: '3', path: '/assets/image.png' },
];

describe('matchLinkTarget (link resolution)', () => {
  it('matches by exact path (with extension)', () => {
    expect(matchLinkTarget('/blog/post.md', blobs)?.id).toBe('1');
  });

  it('matches by exact path (without extension)', () => {
    expect(matchLinkTarget('/blog/post', blobs)?.id).toBe('1');
  });

  it('matches by path suffix', () => {
    expect(matchLinkTarget('blog/post.md', blobs)?.id).toBe('1');
  });

  it('matches by basename without extension', () => {
    expect(matchLinkTarget('guide', blobs)?.id).toBe('2');
  });

  it('matches by basename with extension', () => {
    expect(matchLinkTarget('guide.md', blobs)?.id).toBe('2');
  });

  it('matches .mdx files', () => {
    const mdxBlobs = [{ id: '4', path: '/page.mdx' }];
    expect(matchLinkTarget('page', mdxBlobs)?.id).toBe('4');
  });

  it('returns undefined when no match', () => {
    expect(matchLinkTarget('nonexistent', blobs)).toBeUndefined();
  });
});
