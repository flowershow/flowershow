import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  PageRow,
  SiteAnalytics,
  SiteCountability,
} from '@/lib/site-analytics/site-analytics';
import AnalyticsView from './analytics-view';

afterEach(cleanup);

const NOW = new Date('2026-11-20T12:06:00Z');
const page = (
  i: number,
  href: string | null = `https://x.me/p${i}`,
): PageRow => ({
  path: `/p${i}`,
  title: `Page ${i}`,
  href,
  people: 100 - i,
  views: 200 - i,
});

type Ok = Extract<SiteAnalytics, { status: 'ok' }>;
const ok = (over: Partial<Ok> = {}): SiteAnalytics => ({
  status: 'ok',
  range: 30,
  chartStart: '2026-11-12',
  countingSince: '2026-11-12',
  fetchedAt: '2026-11-20T12:00:00Z',
  totals: { people: 412, views: 1380 },
  series: [
    { date: '2026-11-12', views: 3 },
    { date: '2026-11-13', views: 9 },
  ],
  pages: [page(1), page(2)],
  referrers: [{ domain: 'google.com', people: 96 }],
  ...over,
});
const counted: SiteCountability = { kind: 'counted', hasRawHtml: false };

const view = (
  data: SiteAnalytics,
  countability: SiteCountability = counted,
  range: 7 | 30 = 30,
) =>
  render(
    <AnalyticsView
      data={data}
      countability={countability}
      range={range}
      siteUrl="https://x.flowershow.me"
      basePath="/site/s1/analytics"
      now={NOW}
    />,
  );

describe('AnalyticsView', () => {
  it('shows totals, range links and the people tooltip', () => {
    view(ok());
    expect(screen.getByText('412')).toBeInTheDocument();
    expect(screen.getByText('1,380')).toBeInTheDocument();
    expect(
      screen.getByTitle(
        'An estimate based on device and browser, not a head count.',
      ),
    ).toHaveTextContent('People');
    expect(screen.getAllByText('Views').length).toBeGreaterThan(0);
    const l30 = screen.getByRole('link', { name: '30 days' });
    expect(l30).toHaveAttribute('href', '/site/s1/analytics?range=30');
    expect(l30).toHaveAttribute('aria-current', 'page');
    const l7 = screen.getByRole('link', { name: '7 days' });
    expect(l7).toHaveAttribute('href', '/site/s1/analytics?range=7');
    expect(l7).not.toHaveAttribute('aria-current');
  });

  it('labels the chart', () => {
    view(ok());
    expect(
      screen.getByRole('img', {
        name: 'Views per day, 12 Nov to 13 Nov: 12 in total.',
      }),
    ).toBeInTheDocument();
  });

  it('shows 10 pages then all', () => {
    const pages = Array.from({ length: 25 }, (_, i) => page(i));
    view(ok({ pages, referrers: [] }));
    const pagesRows = () =>
      within(screen.getByText('Pages').closest('section')!).getAllByRole('row');
    expect(pagesRows()).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 25 pages' }));
    expect(pagesRows()).toHaveLength(26);
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
  });

  it('renders a page with no href as plain text', () => {
    view(ok({ pages: [{ ...page(1, null), title: null, path: '/gone' }] }));
    expect(screen.getByText('/gone')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '/gone' })).toBeNull();
  });

  it('shows up to 5 referrers, or nothing', () => {
    const referrers = Array.from({ length: 7 }, (_, i) => ({
      domain: `d${i}.com`,
      people: 10 - i,
    }));
    const { unmount } = view(ok({ referrers }));
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('d4.com')).toBeInTheDocument();
    expect(screen.queryByText('d5.com')).toBeNull();
    unmount();
    view(ok({ referrers: [] }));
    expect(screen.queryByText('Sources')).toBeNull();
  });

  it('shows the footer', () => {
    view(ok());
    expect(
      screen.getByText('Includes your own visits. Updated 6 minutes ago.'),
    ).toBeInTheDocument();
  });

  it('shows the empty state with the site link and a copy button', () => {
    view(ok({ totals: { people: 0, views: 0 }, pages: [], referrers: [] }));
    expect(
      screen.getByText(
        'No readers yet. Counting started on 12 Nov. Numbers update every 10 minutes.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'https://x.flowershow.me' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy link' }),
    ).toBeInTheDocument();
  });

  it('7-day zero after counting began: no readers in range, no copy link', () => {
    view(
      ok({
        range: 7,
        chartStart: '2027-01-04',
        countingSince: '2026-11-12',
        totals: { people: 0, views: 0 },
        pages: [],
        referrers: [],
      }),
      counted,
      7,
    );
    expect(
      screen.getByText('No readers in the last 7 days.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No readers yet/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
  });

  it('notes raw HTML pages', () => {
    view(ok(), { kind: 'counted', hasRawHtml: true });
    expect(
      screen.getByText("Pages published as raw HTML aren't counted."),
    ).toBeInTheDocument();
  });

  it('html-only: message and no numbers', () => {
    view(ok(), { kind: 'html-only', hasRawHtml: true });
    expect(
      screen.getByText(
        "This site's pages are raw HTML, which we can't count yet.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('412')).toBeNull();
  });

  it('password: message and no numbers', () => {
    view(ok(), { kind: 'password', hasRawHtml: false });
    expect(
      screen.getByText("Password-protected sites aren't counted."),
    ).toBeInTheDocument();
    expect(screen.queryByText('412')).toBeNull();
  });

  it('unavailable', () => {
    view({ status: 'unavailable' });
    expect(
      screen.getByText("Numbers aren't available right now."),
    ).toBeInTheDocument();
  });
});
