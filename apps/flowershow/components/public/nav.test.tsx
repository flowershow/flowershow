import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { pathname } = vi.hoisted(() => ({ pathname: { value: '/' } }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}));
vi.mock('@/components/public/search-modal', () => ({
  SearchModal: () => <button type="button">Search</button>,
}));
vi.mock('./theme-switch', () => ({
  default: () => <button type="button">Theme</button>,
}));

import Nav, { CustomNavbar } from './nav';

afterEach(() => {
  cleanup();
  pathname.value = '/';
});

const menu = (
  <>
    <a href="/">Home</a>
    <details className="menu">
      <summary>Menu</summary>
      <ul>
        <li>
          <a href="/about">About</a>
        </li>
      </ul>
    </details>
  </>
);

describe('CustomNavbar', () => {
  it('renders the custom content inside the navbar shell', () => {
    const { container } = render(<CustomNavbar content={menu} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toHaveClass('site-navbar', 'site-navbar--custom');
    expect(
      container.querySelector('.site-navbar-inner > .site-navbar-custom'),
    ).toHaveTextContent('Home');
    // No config-driven chrome: no logo/title link, no hamburger.
    expect(
      container.querySelector('.site-navbar-site-title'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('.site-navbar-mobile-nav-button'),
    ).not.toBeInTheDocument();
  });

  it('shows search and the theme switch only when enabled', () => {
    const { rerender } = render(<CustomNavbar content={menu} />);
    expect(screen.queryByText('Search')).not.toBeInTheDocument();
    expect(screen.queryByText('Theme')).not.toBeInTheDocument();

    rerender(
      <CustomNavbar
        content={menu}
        showSearch
        searchId="site-1"
        showThemeSwitch
      />,
    );
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('closes an open <details> menu after a route change', () => {
    const { container, rerender } = render(<CustomNavbar content={menu} />);
    const details = container.querySelector('details')!;
    details.setAttribute('open', '');

    pathname.value = '/about';
    rerender(<CustomNavbar content={menu} />);
    expect(details).not.toHaveAttribute('open');
  });

  it('closes an open menu when a link inside it is clicked', () => {
    const { container } = render(<CustomNavbar content={menu} />);
    const details = container.querySelector('details')!;
    details.setAttribute('open', '');
    const link = screen.getByRole('link', { name: 'About', hidden: true });
    link.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(link);
    expect(details).not.toHaveAttribute('open');
  });

  it('closes an open menu on Escape and returns focus to its summary', () => {
    const { container } = render(<CustomNavbar content={menu} />);
    const details = container.querySelector('details')!;
    details.setAttribute('open', '');
    screen.getByRole('link', { name: 'About' }).focus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(details).not.toHaveAttribute('open');
    expect(document.activeElement).toBe(container.querySelector('summary'));
  });

  it('closes an open menu on a click outside it, but not inside it', () => {
    const { container } = render(<CustomNavbar content={menu} />);
    const details = container.querySelector('details')!;
    details.setAttribute('open', '');

    fireEvent.pointerDown(container.querySelector('summary')!);
    expect(details).toHaveAttribute('open');

    fireEvent.pointerDown(document.body);
    expect(details).not.toHaveAttribute('open');
  });
});

describe('Nav (default)', () => {
  it('has the Main landmark label', () => {
    render(<Nav logo="🌸" url="/" title="My Site" />);
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toHaveClass(
      'site-navbar--custom',
    );
    expect(screen.getByText('My Site')).toBeInTheDocument();
  });
});
