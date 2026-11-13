import { formatNumber } from './format';

export type ShareRow = {
  key: string;
  label: string;
  href?: string | null;
  people: number;
  views?: number;
};

/** Rows with a faint bar behind each one showing its share of people. */
export function ShareTable({
  heading,
  rows,
  total,
}: {
  heading: string;
  rows: ShareRow[];
  total: number;
}) {
  const showViews = rows.some((r) => r.views !== undefined);
  const head = 'pb-2 text-xs font-medium text-stone-500 dark:text-zinc-400';
  const num =
    'relative py-1.5 pl-3 text-right tabular-nums text-stone-600 dark:text-zinc-300';

  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="text-left">
          <th className={head}>{heading}</th>
          <th className={`${head} w-16 text-right`}>People</th>
          {showViews && <th className={`${head} w-16 text-right`}>Views</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const share = total > 0 ? Math.min(1, r.people / total) : 0;
          return (
            <tr key={r.key}>
              <td className="relative py-1.5 pr-3">
                <div
                  aria-hidden
                  className="absolute inset-y-0.5 left-0 rounded bg-stone-100 dark:bg-zinc-800"
                  style={{ width: `${share * 100}%` }}
                />
                <div className="relative truncate px-2 text-stone-800 dark:text-zinc-100">
                  {r.href ? (
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {r.label}
                    </a>
                  ) : (
                    r.label
                  )}
                </div>
              </td>
              <td className={num}>{formatNumber(r.people)}</td>
              {showViews && (
                <td className={num}>{formatNumber(r.views ?? 0)}</td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
