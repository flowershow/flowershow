import type { Annotation } from '@flowershow/api-contract';

export type OwnerAction = 'resolve' | 'reopen' | 'delete';

export function CommentItem({
  annotation,
  onSelect,
  focused = false,
  onOwnerAction,
}: {
  annotation: Annotation;
  /** Scroll the page to this comment's highlight (absent when the quote isn't on the page). */
  onSelect?: () => void;
  focused?: boolean;
  /** Present only for the signed-in site owner: resolve/reopen and delete. */
  onOwnerAction?: (action: OwnerAction) => void;
}) {
  const quote = `“${truncate(annotation.selector.exact, 140)}”`;
  return (
    <li
      id={`fs-annotation-${annotation.id}`}
      className={
        focused ? 'fs-annotations-item is-focused' : 'fs-annotations-item'
      }
    >
      {onSelect ? (
        <button
          type="button"
          className="fs-annotations-quote"
          onClick={onSelect}
        >
          {quote}
        </button>
      ) : (
        <blockquote className="fs-annotations-quote">{quote}</blockquote>
      )}
      <p className="fs-annotations-note">{annotation.note}</p>
      <CommentMeta annotation={annotation} />
      {onOwnerAction && (
        <p className="fs-annotations-owner-actions">
          <button
            type="button"
            className="fs-annotations-link"
            onClick={() =>
              onOwnerAction(annotation.status === 'open' ? 'resolve' : 'reopen')
            }
          >
            {annotation.status === 'open' ? 'Resolve' : 'Reopen'}
          </button>
          <button
            type="button"
            className="fs-annotations-link"
            onClick={() => onOwnerAction('delete')}
          >
            Delete
          </button>
        </p>
      )}
    </li>
  );
}

export function CommentMeta({ annotation }: { annotation: Annotation }) {
  return (
    <p className="fs-annotations-meta">
      {annotation.authorName || 'Anonymous'} ·{' '}
      <time
        dateTime={annotation.createdAt}
        title={formatDate(annotation.createdAt)}
      >
        {formatRelative(annotation.createdAt)}
      </time>
    </p>
  );
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "2 days ago", "just now"; full date lives in the <time> title. */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  if (Number.isNaN(seconds)) return '';
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size)
      return format.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}
