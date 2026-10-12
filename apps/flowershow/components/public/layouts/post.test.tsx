import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/image', () => ({
  default: ({ fill: _f, priority: _p, ...p }: Record<string, unknown>) => (
    // biome-ignore lint/a11y/useAltText: alt is passed through
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...(p as object)} />
  ),
}));
import { PostLayout, PostNav } from './post';

const render = (props: Partial<Parameters<typeof PostLayout>[0]> = {}) =>
  renderToStaticMarkup(
    <PostLayout title="Hello" locale="en-US" {...props}>
      <p>Body</p>
    </PostLayout>,
  );

describe('PostLayout', () => {
  it('keeps the page header classes and adds the post hooks', () => {
    const html = render({
      description: 'A dek',
      eyebrow: [{ label: 'Blog', href: '/blog' }],
      authors: [
        { key: 'a', name: 'Ann', url: '/people/ann', avatar: 'http://s/a.jpg' },
        { key: 'b', name: 'Bob', url: null },
        { key: 'c', name: 'Cy', url: null },
      ],
      date: '2026-09-18',
      readingTime: '4 min read',
      hero: {
        src: 'http://s/h.png',
        alt: '',
        caption: 'Cap',
        width: 1600,
        height: 1000,
      },
      tags: ['x'],
    });
    expect(html).toContain('<article class="post-page" data-layout="post">');
    expect(html).toContain('<header class="page-header post-header">');
    expect(html).toContain(
      '<nav aria-label="Breadcrumb" class="page-header-breadcrumbs post-eyebrow">',
    );
    expect(html).toContain(
      '<a class="page-header-breadcrumb-link" href="/blog">Blog</a>',
    );
    expect(html).toContain('<h1 class="page-header-title">Hello</h1>');
    expect(html).toContain(
      '<p class="page-header-description post-dek">A dek</p>',
    );
    expect(html).toContain(
      'class="page-header-authors-container post-byline-authors"',
    );
    expect(html).toMatch(
      /<img class="page-header-author-avatar post-byline-avatar"[^>]*alt=""/,
    );
    expect(html).toContain(
      'Ann</a></span><span class="page-header-author-name-wrapper">, <span class="page-header-author-name">Bob</span>',
    );
    expect(html).toContain(
      ' and <span class="page-header-author-name">Cy</span>',
    );
    expect(html).toContain(
      '<time dateTime="2026-09-18">September 18, 2026</time>',
    );
    expect(html).toContain('4 min read');
    expect(html).toMatch(
      /<img class="post-hero-img"[^>]*width="1600" height="1000"/,
    );
    expect(html).toContain(
      '<figcaption class="post-hero-caption">Cap</figcaption>',
    );
    expect(html).toContain(
      '<footer class="post-footer"><div class="page-header-tags post-tags"><a class="tag-pill" href="/tags/x">#x</a>',
    );
  });
  it('leaves out what is not there', () => {
    const html = render();
    expect(html).not.toContain('post-byline');
    expect(html).not.toContain('post-eyebrow');
    expect(html).not.toContain('post-dek');
    expect(html).not.toContain('post-hero');
    expect(html).not.toContain('post-footer');
  });
  it('a cover of unknown size is a plain, uncropped img', () => {
    const html = render({
      hero: { src: 'https://cdn/x.jpg', alt: 'X', caption: null },
    });
    expect(html).toContain('<figure class="post-hero" data-size="unknown">');
    expect(html).toContain(
      '<img class="post-hero-img" src="https://cdn/x.jpg" alt="X" fetchPriority="high" decoding="async"/>',
    );
  });
  it('shows a date that is not a date as written; no header with showHeader false', () => {
    expect(render({ date: '1964-1982' })).toContain('<span>1964-1982</span>');
    expect(render({ showHeader: false })).not.toContain('<header');
  });
});

describe('PostNav', () => {
  it('labels previous and next; a missing side is an aria-hidden placeholder', () => {
    const html = renderToStaticMarkup(
      <PostNav previous={{ url: '/blog/a', title: 'A' }} next={null} />,
    );
    expect(html).toContain('aria-label="Previous and next posts"');
    expect(html).toContain('rel="prev" href="/blog/a"');
    expect(html).toContain(
      '<div class="post-nav-placeholder" aria-hidden="true"></div>',
    );
    expect(renderToStaticMarkup(<PostNav previous={null} next={null} />)).toBe(
      '',
    );
  });
});
