import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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
