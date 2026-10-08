import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { pathname } = vi.hoisted(() => ({ pathname: { value: '/about' } }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}));
// Mark next/link output so tests can tell soft links from plain anchors.
vi.mock('next/link', () => ({
  default: ({ href, ...props }: any) => (
    <a href={href} data-next-link="" {...props} />
  ),
}));

import NavbarAnchor, {
  isClientNavigable,
  isCurrentPage,
} from './navbar-anchor';

afterEach(cleanup);

describe('isClientNavigable', () => {
  it.each(['/', '/about', '/docs/getting-started', '/blog?page=2', '/a#b'])(
    'is true for the same-site page link %s',
    (href) => {
      expect(isClientNavigable({ href })).toBe(true);
    },
  );

  it.each([
    ['an external link', { href: 'https://example.com/about' }],
    ['a protocol-relative link', { href: '//example.com/about' }],
    ['a hash-only link', { href: '#section' }],
    ['a mailto link', { href: 'mailto:hi@example.com' }],
    ['a raw markdown file', { href: '/notes.md' }],
    ['a pdf', { href: '/assets/report.pdf' }],
    ['the RSS feed', { href: '/rss.xml' }],
    ['an html file', { href: '/page.html' }],
    ['a target=_blank link', { href: '/about', target: '_blank' }],
    ['a download link', { href: '/about', download: '' }],
    ['a link without href', { href: undefined }],
  ])('is false for %s', (_, props) => {
    expect(isClientNavigable(props)).toBe(false);
  });

  it('allows target=_self', () => {
    expect(isClientNavigable({ href: '/about', target: '_self' })).toBe(true);
  });
});

describe('isCurrentPage', () => {
  it.each([
    ['/about', '/about'],
    ['/about/', '/about'],
    ['/about?x=1', '/about'],
    ['/', '/'],
    ['/caf%C3%A9', '/café'],
  ])('%s is the current page at %s', (href, path) => {
    expect(isCurrentPage(href, path)).toBe(true);
  });

  it.each([
    ['/about', '/'],
    ['/', '/about'],
    ['/about#team', '/about'],
    ['https://example.com/about', '/about'],
    [undefined, '/about'],
  ])('%s is not the current page at %s', (href, path) => {
    expect(isCurrentPage(href, path)).toBe(false);
  });
});

describe('NavbarAnchor', () => {
  it('renders same-site page links with next/link', () => {
    render(<NavbarAnchor href="/blog">Blog</NavbarAnchor>);
    const link = screen.getByRole('link', { name: 'Blog' });
    expect(link).toHaveAttribute('data-next-link');
    expect(link).toHaveAttribute('href', '/blog');
  });

  it('renders files and external links as plain anchors', () => {
    render(
      <>
        <NavbarAnchor href="/notes.md">Raw</NavbarAnchor>
        <NavbarAnchor
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ext"
        >
          Ext
        </NavbarAnchor>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Raw' })).not.toHaveAttribute(
      'data-next-link',
    );
    const ext = screen.getByRole('link', { name: 'Ext' });
    expect(ext).not.toHaveAttribute('data-next-link');
    expect(ext).toHaveAttribute('target', '_blank');
    expect(ext).toHaveClass('ext');
  });

  it('marks the link to the current page with aria-current="page"', () => {
    pathname.value = '/about';
    render(
      <>
        <NavbarAnchor href="/about">About</NavbarAnchor>
        <NavbarAnchor href="/">Home</NavbarAnchor>
      </>,
    );
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it("keeps an author's own aria-current", () => {
    pathname.value = '/about';
    render(
      <NavbarAnchor href="/about" aria-current="location">
        About
      </NavbarAnchor>,
    );
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'location',
    );
  });
});
