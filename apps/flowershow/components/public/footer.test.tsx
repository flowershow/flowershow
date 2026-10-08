import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Footer from './footer';
import type { FooterNavigationGroup } from '@/components/types';

afterEach(cleanup);

describe('Footer navigation rendering', () => {
  it('renders links for a well-formed navigation group', async () => {
    const navigation: FooterNavigationGroup[] = [
      { title: 'Docs', links: [{ name: 'Getting Started', href: '/docs' }] },
    ];

    render(await Footer({ siteName: 'My Site', navigation }));

    expect(screen.getByText('Getting Started')).toBeInTheDocument();
  });

  it('does not throw when a group is missing its links array', async () => {
    // A user who saved footer groups without a `links` array (the shape that
    // took portais-cyan-quoisee.flowershow.me to HTTP 500 on every page).
    const navigation = [
      { title: 'Broken' },
    ] as unknown as FooterNavigationGroup[];

    await expect(
      Footer({ siteName: 'My Site', navigation }),
    ).resolves.toBeDefined();
  });

  it('skips flat {name,href} entries but still renders valid groups', async () => {
    // A user who saved a flat list of links instead of groups, mixed with a
    // valid group. The flat entries have no `links` array.
    const navigation = [
      { name: 'Blog', href: '/blog' },
      { title: 'Docs', links: [{ name: 'Guide', href: '/docs' }] },
    ] as unknown as FooterNavigationGroup[];

    render(await Footer({ siteName: 'My Site', navigation }));

    expect(screen.getByText('Guide')).toBeInTheDocument();
    expect(screen.queryByText('Blog')).not.toBeInTheDocument();
  });
});

describe('Footer custom content', () => {
  it('replaces the default footer body with the custom content', async () => {
    const navigation: FooterNavigationGroup[] = [
      { title: 'Docs', links: [{ name: 'Getting Started', href: '/docs' }] },
    ];

    const { container } = render(
      await Footer({
        siteName: 'My Site',
        navigation,
        social: [{ label: 'x', name: 'X', href: 'https://example.com/x' }],
        customContent: <p>Made by Acme</p>,
      }),
    );

    expect(screen.getByText('Made by Acme')).toBeInTheDocument();
    expect(screen.queryByText(/All rights reserved/)).not.toBeInTheDocument();
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
    expect(
      container.querySelector('.site-footer-social-links'),
    ).not.toBeInTheDocument();
  });

  it('keeps the footer landmark, its label and the custom wrapper', async () => {
    const { container } = render(
      await Footer({ siteName: 'My Site', customContent: <p>Hi</p> }),
    );

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('site-footer', 'site-footer--custom');
    expect(footer).toHaveAttribute('aria-labelledby', 'footer');
    expect(container.querySelector('#footer')).toHaveTextContent('Footer');
    expect(container.querySelector('.site-footer-custom')).toHaveTextContent(
      'Hi',
    );
  });

  it('falls back to the default footer when the custom content throws while rendering', async () => {
    const Boom = () => {
      throw new Error('broken footer embed');
    };
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(await Footer({ siteName: 'My Site', customContent: <Boom /> }));

    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).not.toHaveClass(
      'site-footer--custom',
    );
    consoleError.mockRestore();
  });

  it('renders the default footer when no custom content is given', async () => {
    render(await Footer({ siteName: 'My Site' }));

    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).not.toHaveClass(
      'site-footer--custom',
    );
  });
});
