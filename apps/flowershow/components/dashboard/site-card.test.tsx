import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SiteCard from './site-card';

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'development',
    NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.local',
    NEXT_PUBLIC_ROOT_DOMAIN: 'flowershow.local',
  },
}));

afterEach(cleanup);

const site = {
  id: 'abc',
  projectName: 'notes',
  plan: 'FREE',
  customDomain: null,
  subdomain: 'notes-ada',
  role: 'owner',
  lapsed: false,
  ownerUsername: 'ada',
  privacyMode: 'PUBLIC',
} as never;

describe('SiteCard people line', () => {
  it('links the people count to the Analytics tab', () => {
    render(<SiteCard data={site} people={412} />);
    const link = screen.getByRole('link', {
      name: '412 people in the last 30 days',
    });
    expect(link).toHaveAttribute('href', '/site/abc/analytics');
  });

  it('says No readers yet for zero', () => {
    render(<SiteCard data={site} people={0} />);
    expect(screen.getByText('No readers yet')).toBeTruthy();
  });

  it('renders no line on a lapsed shared site', () => {
    render(
      <SiteCard
        data={{ ...(site as object), role: 'editor', lapsed: true } as never}
        people={412}
      />,
    );
    expect(screen.queryByText(/people in the last/)).toBeNull();
  });

  it('renders no line when people is undefined', () => {
    render(<SiteCard data={site} />);
    expect(screen.queryByText(/people in the last/)).toBeNull();
    expect(screen.queryByText('No readers yet')).toBeNull();
  });
});
