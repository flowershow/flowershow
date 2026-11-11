import { formatDay } from './format';

type Point = { date: string; views: number };

/** Small accessible bar chart: views per day. No axes; each bar has a <title>. */
export default function ViewsChart({ series }: { series: Point[] }) {
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last) return null;
  const max = Math.max(1, ...series.map((p) => p.views));
  const total = series.reduce((sum, p) => sum + p.views, 0);
  const step = 10;
  const label = `Views per day, ${formatDay(first.date)} to ${formatDay(last.date)}:${total.toLocaleString('en-US')} in total.`;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${series.length * step} 100`}
      preserveAspectRatio="none"
      className="h-24 w-full text-stone-700 dark:text-zinc-300"
    >
      {series.map((p, i) => {
        const h = p.views === 0 ? 0 : Math.max(2, (p.views / max) * 100);
        return (
          <rect
            key={p.date}
            x={i * step + 1}
            y={100 - h}
            width={step - 2}
            height={h}
            fill="currentColor"
            opacity={0.85}
          >
            <title>{`${formatDay(p.date)}: ${p.views.toLocaleString(
              'en-US',
            )} views`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
