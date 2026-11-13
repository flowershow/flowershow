import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AnalyticsView from '@/components/dashboard/analytics/analytics-view';
import type {
  PageRow,
  SiteAnalytics,
} from '@/lib/site-analytics/site-analytics';
import '@/styles/default-theme.css';

const now = new Date('2026-11-20T12:06:00Z');
const base = {
  siteUrl: 'https://rufus.flowershow.me',
  basePath: '/site/demo/analytics',
  range: 30 as const,
  now,
  countability: { kind: 'counted' as const, hasRawHtml: false },
};

const titles = [
  'Home',
  'Why I write in public',
  'Notes on the commons',
  null,
  'Reading list 2026',
  'How this site is made',
  'On open data',
  'Weekly notes: November',
  'Projects',
  'A short guide to Markdown',
];
const pages: PageRow[] = Array.from({ length: 25 }, (_, i) => {
  const title = i < titles.length ? titles[i]! : `Weekly notes ${i}`;
  return {
    path: `/page-${i}`,
    title,
    href: title ? `https://rufus.flowershow.me/page-${i}` : null,
    people: Math.round(180 / (1 + i * 0.35)),
    views: Math.round(260 / (1 + i * 0.35)),
  };
});

const series = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 9, 22 + i)).toISOString().slice(0, 10),
  views: Math.round(20 + 25 * Math.abs(Math.sin(i / 3)) + (i % 5) * 3),
}));

const ok: SiteAnalytics = {
  status: 'ok',
  range: 30,
  chartStart: '2026-10-22',
  countingSince: '2026-10-22',
  fetchedAt: '2026-11-20T12:00:00Z',
  totals: { people: 412, views: 1380 },
  series,
  pages,
  referrers: [
    { domain: 'google.com', people: 96 },
    { domain: 'x.com', people: 41 },
    { domain: 'news.ycombinator.com', people: 18 },
  ],
};

const meta: Meta<typeof AnalyticsView> = {
  title: 'Dashboard/SiteAnalytics',
  component: AnalyticsView,
  args: { ...base, data: ok },
  decorators: [
    (Story) => (
      <div className="max-w-5xl p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof AnalyticsView>;

export const WithNumbers: Story = {};
export const SevenDays: Story = {
  args: {
    range: 7,
    data: { ...ok, range: 7, series: series.slice(-7) } as SiteAnalytics,
  },
};
// Counting began two days ago: the chart still spans the whole 30 days.
export const JustStarted: Story = {
  args: {
    data: {
      ...ok,
      chartStart: '2026-11-19',
      countingSince: '2026-11-19',
      totals: { people: 75, views: 138 },
      series: series.map((p, i) => ({
        ...p,
        views: i === 28 ? 88 : i === 29 ? 50 : 0,
      })),
    } as SiteAnalytics,
  },
};
export const NoReferrers: Story = {
  args: { data: { ...ok, referrers: [] } as SiteAnalytics },
};
export const SomeRawHtml: Story = {
  args: { countability: { kind: 'counted', hasRawHtml: true } },
};
export const NoReadersYet: Story = {
  args: {
    data: {
      ...ok,
      totals: { people: 0, views: 0 },
      series: [],
      pages: [],
      referrers: [],
    } as SiteAnalytics,
  },
};
export const NoReadersInRange: Story = {
  args: {
    range: 7,
    data: {
      ...ok,
      range: 7,
      chartStart: '2026-11-14',
      totals: { people: 0, views: 0 },
      series: [],
      pages: [],
      referrers: [],
    } as SiteAnalytics,
  },
};
export const AllRawHtml: Story = {
  args: { countability: { kind: 'html-only', hasRawHtml: true } },
};
export const PasswordProtected: Story = {
  args: { countability: { kind: 'password', hasRawHtml: false } },
};
export const Unavailable: Story = {
  args: { data: { status: 'unavailable' } },
};
