import { formatDay, formatNumber } from './format';

type Point = { date: string; views: number };

/** Round up to 1, 2 or 5 × 10ⁿ (at least 4, never 5) so half is whole. */
export function niceMax(n: number): number {
  if (n <= 4) return 4;
  if (n <= 10) return 10;
  const mag = 10 ** Math.floor(Math.log10(n));
  const step = [1, 2, 5, 10].find((s) => s * mag >= n)!;
  return step * mag;
}

/**
 * Indexes to label on the x axis, always including the last day: about
 * `target` of them, or every day when there are no more than `target` days.
 */
export function labelIndexes(length: number, target = 7): Set<number> {
  const every = length <= target ? 1 : Math.ceil(length / (target - 2));
  const out = new Set<number>();
  for (let i = length - 1; i >= 0; i -= every) out.add(i);
  return out;
}

/** Views per day as bars, with a light scale, date labels and hover values. */
export default function ViewsChart({ series }: { series: Point[] }) {
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last) return null;
  const max = niceMax(Math.max(...series.map((p) => p.views)));
  const total = series.reduce((sum, p) => sum + p.views, 0);
  const label = `Views per day, ${formatDay(first.date)} to ${formatDay(last.date)}: ${formatNumber(total)} in total.`;
  const labels = labelIndexes(series.length);
  // Fewer labels on phones so dates don't run into each other.
  const narrowLabels = labelIndexes(series.length, 4);
  const muted = 'text-xs tabular-nums text-stone-500 dark:text-zinc-400';

  return (
    <figure role="img" aria-label={label} className="flex gap-2">
      <table className="sr-only">
        <tbody>
          {series.map((p) => (
            <tr key={p.date}>
              <td>{formatDay(p.date)}</td>
              <td>{formatNumber(p.views)} views</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`relative h-40 w-8 shrink-0 ${muted}`} aria-hidden>
        {[max, max / 2, 0].map((v, i) => (
          <span
            key={v}
            className="absolute right-0 -translate-y-1/2"
            style={{ top: `${i * 50}%` }}
          >
            {formatNumber(v)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1" aria-hidden>
        <div className="relative h-40">
          {[0, 50, 100].map((top) => (
            <div
              key={top}
              className={`absolute inset-x-0 border-t ${
                top === 100
                  ? 'border-stone-300 dark:border-zinc-600'
                  : 'border-dashed border-stone-200 dark:border-zinc-800'
              }`}
              style={{ top: `${top}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px] sm:gap-1">
            {series.map((p, i) => (
              <div
                key={p.date}
                title={`${formatDay(p.date)}: ${formatNumber(p.views)} views`}
                className="group relative flex h-full flex-1 items-end"
              >
                <div
                  className="w-full rounded-t-sm bg-stone-600 transition-colors group-hover:bg-stone-900 dark:bg-zinc-400 dark:group-hover:bg-zinc-100"
                  style={{
                    // A floor so a day with a few views isn't lost on a big scale.
                    height:
                      p.views === 0 ? 0 : `max(2px, ${(p.views / max) * 100}%)`,
                  }}
                />
                <span
                  className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap ${
                    // Keep the tooltip inside the card at either edge.
                    i < series.length / 3
                      ? 'left-0'
                      : i >= (series.length * 2) / 3
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2'
                  } rounded bg-stone-900 px-2 py-1 text-xs text-white shadow group-hover:block dark:bg-zinc-100 dark:text-zinc-900`}
                >
                  {formatDay(p.date)}: {formatNumber(p.views)} views
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className={`mt-2 flex gap-[2px] sm:gap-1 ${muted}`}>
          {series.map((p, i) => {
            const wide = labels.has(i);
            const narrow = narrowLabels.has(i);
            return (
              <div key={p.date} className="relative h-4 flex-1">
                {(wide || narrow) && (
                  <span
                    className={`absolute top-0 whitespace-nowrap ${
                      wide && narrow
                        ? ''
                        : narrow
                          ? 'sm:hidden'
                          : 'hidden sm:inline'
                    } ${
                      i === series.length - 1
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2'
                    }`}
                  >
                    {formatDay(p.date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
