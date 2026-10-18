import type { CSSProperties, Ref } from 'react';

export const PANEL_ID = 'fs-annotations-panel';

export interface CommentsBarProps {
  /** Open comments on this page. */
  count: number;
  open: boolean;
  onToggle: () => void;
  toggleRef?: Ref<HTMLButtonElement>;
  style?: CSSProperties;
}

/**
 * Slim bar under the site navbar: tells a reader the page is open for comments,
 * how many there are, and toggles the comments panel. Sticky on desktop only (CSS).
 */
export function CommentsBar({
  count,
  open,
  onToggle,
  toggleRef,
  style,
}: CommentsBarProps) {
  const status =
    count > 0
      ? `${count} ${count === 1 ? 'comment' : 'comments'}`
      : 'Open for comments';
  const hasToggle = count > 0 || open;
  return (
    <div
      className={hasToggle ? 'fs-comments-bar has-toggle' : 'fs-comments-bar'}
      style={style}
    >
      <div className="fs-comments-bar-inner">
        <span className="fs-comments-bar-status">
          <CommentIcon />
          {status}
        </span>
        <span className="fs-comments-bar-hint">Select text to comment</span>
        {hasToggle && (
          <button
            ref={toggleRef}
            type="button"
            className="fs-comments-bar-toggle"
            aria-expanded={open}
            // Only point at the panel while it exists (1pr.6).
            aria-controls={open ? PANEL_ID : undefined}
            onClick={onToggle}
          >
            {open ? 'Hide comments' : 'Show comments'}
          </button>
        )}
      </div>
    </div>
  );
}

function CommentIcon() {
  return (
    <svg
      className="fs-comments-bar-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
