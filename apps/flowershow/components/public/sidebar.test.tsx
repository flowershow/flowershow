import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Node } from '@/lib/build-site-tree';
import { SiteContentsMenu } from './sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

const ITEMS: Node[] = [
  {
    kind: 'file',
    label: 'Getting started',
    name: 'getting-started.md',
    path: 'getting-started.md',
    urlPath: '/getting-started',
    metadata: null,
  },
  {
    kind: 'file',
    label: 'About',
    name: 'about.md',
    path: 'about.md',
    urlPath: '/about',
    metadata: null,
  },
];

afterEach(() => {
  cleanup();
});

describe('SiteContentsMenu', () => {
  it('renders a Site contents button and opens the site tree in the page drawer', async () => {
    render(<SiteContentsMenu items={ITEMS} />);
    const button = screen.getByRole('button', { name: 'Site contents' });
    expect(button.classList.contains('site-contents-menu-button')).toBe(true);
    expect(screen.queryByText('Getting started')).toBeNull();

    fireEvent.click(button);

    expect(await screen.findByText('Getting started')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
    const drawer = document.querySelector('.sidebar-drawer');
    expect(drawer?.classList.contains('is-page-menu')).toBe(true);
  });
});
