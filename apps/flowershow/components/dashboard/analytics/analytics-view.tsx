import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
} from '@/lib/site-analytics/config';
import type {
  SiteAnalytics,
  SiteCountability,
} from '@/lib/site-analytics/site-analytics';
import CopyButton from './copy-button';
import { formatDay, formatNumber, formatUpdated } from './format';
import PagesTable from './pages-table';
import ViewsChart from './views-chart';

export type AnalyticsViewProps = {
  data: SiteAnalytics;
  countability: SiteCountability;
  range: AnalyticsRange;
  siteUrl: string;
  /** e.g. /site/{id}/analytics */
  basePath: string;
  now?: Date;
};

const note = 'text-sm text-stone-500 dark:text-zinc-400';

function RangeToggle({
  range,
  basePath,
}: Pick<AnalyticsViewProps, 'range' | 'basePath'>) {
  return (
    <div className="inline-flex rounded-md border border-stone-200 text-sm dark:border-zinc-700">
      {ANALYTICS_RANGES.map((r) => (
        <a
          key={r}
          href={`${basePath}?range=${r}`}
          aria-current={r === range ? 'page' : undefined}
          className={`px-3 py-1 ${
            r === range
              ? 'bg-stone-100 font-medium text-stone-900 dark:bg-zinc-800 dark:text-zinc-100'
              : 'text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {r} days
        </a>
      ))}
    </div>
  );
}

function Stat({
  value,
  label,
  title,
}: {
  value: number;
  label: string;
  title?: string;
}) {
  return (
    <div>
      <div className="text-4xl font-semibold tabular-nums text-stone-900 dark:text-zinc-100">
        {formatNumber(value)}
      </div>
      <div
        title={title}
        className={`${note} ${title ? 'cursor-help underline decoration-dotted' : ''}`}
      >
        {label}
      </div>
    </div>
  );
}

export default function AnalyticsView({
  data,
  countability,
  range,
  siteUrl,
  basePath,
  now = new Date(),
}: AnalyticsViewProps) {
  let body: React.ReactNode;
  let footer: React.ReactNode = null;
  let toggle = false;

  if (countability.kind === 'password') {
    body = <p className={note}>Password-protected sites aren't counted.</p>;
  } else if (countability.kind === 'html-only') {
    body = (
      <p className={note}>
        This site's pages are raw HTML, which we can't count yet.
      </p>
    );
  } else if (data.status === 'unavailable') {
    body = <p className={note}>Numbers aren't available right now.</p>;
  } else {
    toggle = true;
    const since = formatDay(data.countingSince);
    const referrers = data.referrers.slice(0, 5);
    body =
      data.totals.people === 0 && data.totals.views === 0 ? (
        <div className="space-y-3">
          <p className={note}>
            No readers yet. Counting started on {since}. Numbers update every 10
            minutes.
          </p>
          <div className="flex items-center gap-3 text-sm">
            <a
              href={siteUrl}
              className="text-stone-800 hover:underline dark:text-zinc-100"
            >
              {siteUrl}
            </a>
            <CopyButton text={siteUrl} />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6 sm:flex sm:gap-12">
            <Stat
              value={data.totals.people}
              label="people"
              title="An estimate based on device and browser, not a head count."
            />
            <Stat value={data.totals.views} label="views" />
          </div>
          <ViewsChart series={data.series} />
          <PagesTable pages={data.pages} />
          {referrers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-stone-800 dark:text-zinc-100">
                Readers came from
              </h3>
              <p className={note}>
                {referrers
                  .map((r) => `${r.domain} ${formatNumber(r.people)}`)
                  .join(' · ')}
              </p>
            </div>
          )}
        </div>
      );
    footer = (
      <div className={`mt-8 space-y-1 ${note}`}>
        <p>Counted without cookies since {since}. Includes your own visits.</p>
        <p>{formatUpdated(data.fetchedAt, now)}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-800 dark:text-zinc-100">
          Analytics
        </h2>
        {toggle && <RangeToggle range={range} basePath={basePath} />}
      </div>
      {body}
      {toggle && countability.hasRawHtml && (
        <p className={`mt-6 ${note}`}>
          Pages published as raw HTML aren't counted.
        </p>
      )}
      {toggle && footer}
    </div>
  );
}
