import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SiteTabs from './site-tabs';

vi.mock('next/navigation', () => ({
  usePathname: () => '/site/abc/settings',
}));

afterEach(cleanup);

describe('SiteTabs', () => {
  it('renders an Analytics tab after Settings when showAnalytics is set', () => {
    render(<SiteTabs siteId="abc" showAnalytics />);
    const labels = screen.getAllByRole('link').map((l) => l.textContent);
    expect(labels.indexOf('Analytics')).toBe(labels.indexOf('Settings') + 1);
    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute(
      'href',
      '/site/abc/analytics',
    );
  });

  it('has no Analytics tab by default', () => {
    render(<SiteTabs siteId="abc" />);
    expect(screen.queryByRole('link', { name: 'Analytics' })).toBeNull();
  });
});
