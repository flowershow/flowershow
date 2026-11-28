import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SiteBanner, siteBannerStorageKey } from './site-banner';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const KEY = siteBannerStorageKey('site_1');

describe('SiteBanner', () => {
  it('shows the message with a dismiss button', () => {
    render(
      <SiteBanner siteId="site_1" text="Hi" dismissible>
        Hi
      </SiteBanner>,
    );
    expect(screen.getByText('Hi')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Dismiss announcement' }),
    ).toBeInTheDocument();
  });

  it('has no dismiss button when not dismissible', () => {
    render(
      <SiteBanner siteId="site_1" text="Hi" dismissible={false}>
        Hi
      </SiteBanner>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('hides on dismiss and remembers the dismissed text', () => {
    const { unmount } = render(
      <SiteBanner siteId="site_1" text="Hi" dismissible>
        Hi
      </SiteBanner>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('Hi')).toBeNull();
    expect(localStorage.getItem(KEY)).toBe('Hi');

    unmount();
    render(
      <SiteBanner siteId="site_1" text="Hi" dismissible>
        Hi
      </SiteBanner>,
    );
    expect(screen.queryByText('Hi')).toBeNull();
  });

  it('shows again when the text changes', () => {
    localStorage.setItem(KEY, 'Old text');
    render(
      <SiteBanner siteId="site_1" text="New text" dismissible>
        New text
      </SiteBanner>,
    );
    expect(screen.getByText('New text')).toBeInTheDocument();
  });

  it('ignores a stored dismissal when not dismissible', () => {
    localStorage.setItem(KEY, 'Hi');
    render(
      <SiteBanner siteId="site_1" text="Hi" dismissible={false}>
        Hi
      </SiteBanner>,
    );
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });

  it('keeps dismissals per site', () => {
    localStorage.setItem(siteBannerStorageKey('other'), 'Hi');
    render(
      <SiteBanner siteId="site_1" text="Hi" dismissible>
        Hi
      </SiteBanner>,
    );
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });
});
