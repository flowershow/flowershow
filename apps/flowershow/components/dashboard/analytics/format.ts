const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** 'YYYY-MM-DD' or ISO string -> '12 Nov' (UTC). */
export function formatDay(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export const formatNumber = (n: number) => n.toLocaleString('en-US');

/** 'Updated just now.' / 'Updated 6 minutes ago.' / 'Updated 2 hours ago.' */
export function formatUpdated(fetchedAt: string, now: Date): string {
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - new Date(fetchedAt).getTime()) / 60_000),
  );
  if (minutes < 1) return 'Updated just now.';
  if (minutes < 60)
    return `Updated ${minutes} minute${minutes === 1 ? '' : 's'} ago.`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours} hour${hours === 1 ? '' : 's'} ago.`;
}
