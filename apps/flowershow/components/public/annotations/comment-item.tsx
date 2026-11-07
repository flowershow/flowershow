import type { Annotation, AnnotationReply } from '@flowershow/api-contract';
import { type KeyboardEvent, useState } from 'react';
import { ANNOTATION_LIMITS } from '@/lib/annotations/limits';

export function CommentItem({
  annotation,
  onSelect,
  focused = false,
  rememberedName,
  replyOpen,
  onOpenReply,
  onCloseReply,
  onPostReply,
  onSetStatus,
  onDelete,
}: {
  annotation: Annotation;
  /** Scroll the page to this comment's highlight (absent when the quote isn't on the page). */
  onSelect?: () => void;
  focused?: boolean;
  /** Name remembered from an earlier comment or reply, if any. */
  rememberedName: string;
  /** Only one comment's reply form is open at a time; the parent owns which. */
  replyOpen: boolean;
  onOpenReply: () => void;
  onCloseReply: () => void;
  /** Resolves to an error message, or null once the reply is posted. */
  onPostReply: (note: string, authorName: string) => Promise<string | null>;
  onSetStatus: (status: 'open' | 'resolved') => void;
  /** Present only for the signed-in site owner. */
  onDelete?: () => void;
}) {
  const quote = `“${truncate(annotation.selector.exact, 140)}”`;
  const isOpen = annotation.status === 'open';
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
      {annotation.replies.length > 0 && (
        <ul className="fs-annotations-replies">
          {annotation.replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} />
          ))}
        </ul>
      )}
      {replyOpen && (
        <ReplyForm
          rememberedName={rememberedName}
          onCancel={onCloseReply}
          onPost={onPostReply}
        />
      )}
      {!isOpen && (
        <p className="fs-annotations-meta">
          {annotation.resolvedBy
            ? `Resolved by ${annotation.resolvedBy}`
            : 'Resolved'}
        </p>
      )}
      <p className="fs-annotations-owner-actions">
        {isOpen && !replyOpen && (
          <button
            type="button"
            className="fs-annotations-link"
            onClick={onOpenReply}
          >
            Reply
          </button>
        )}
        <button
          type="button"
          className="fs-annotations-link"
          onClick={() => onSetStatus(isOpen ? 'resolved' : 'open')}
        >
          {isOpen ? 'Resolve' : 'Reopen'}
        </button>
        {onDelete && (
          <button
            type="button"
            className="fs-annotations-link"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </p>
    </li>
  );
}

function ReplyItem({ reply }: { reply: AnnotationReply }) {
  return (
    <li className="fs-annotations-reply">
      <p className="fs-annotations-meta">
        <span className="fs-annotations-author">
          {reply.authorName || 'Anonymous'}
        </span>
        {reply.byOwner && <span className="fs-annotations-badge">Author</span>}{' '}
        ·{' '}
        <time dateTime={reply.createdAt} title={formatDate(reply.createdAt)}>
          {formatRelative(reply.createdAt)}
        </time>
      </p>
      <p className="fs-annotations-note">{reply.note}</p>
    </li>
  );
}

function ReplyForm({
  rememberedName,
  onCancel,
  onPost,
}: {
  rememberedName: string;
  onCancel: () => void;
  onPost: (note: string, authorName: string) => Promise<string | null>;
}) {
  const [note, setNote] = useState('');
  const [name, setName] = useState(rememberedName);
  const [editingName, setEditingName] = useState(!rememberedName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!note.trim() || saving) return;
    setSaving(true);
    setError(null);
    const message = await onPost(note.trim(), name.trim());
    // On success the parent closes the form, so only a failure needs the state back.
    if (message) {
      setError(message);
      setSaving(false);
    }
  };

  // On the form, so Escape in the name field cancels the reply too.
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      // Cancel the reply only: the document-level handler would close the whole panel.
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      onCancel();
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form
      className="fs-annotations-form fs-annotations-reply-form"
      onKeyDown={onKeyDown}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <textarea
        name="reply"
        aria-label="Reply"
        placeholder="Reply…"
        required
        maxLength={ANNOTATION_LIMITS.note}
        rows={2}
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {editingName ? (
        <label>
          Your name (optional)
          <input
            name="authorName"
            maxLength={ANNOTATION_LIMITS.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      ) : (
        <p className="fs-annotations-meta">
          Replying as {name} ·{' '}
          <button
            type="button"
            className="fs-annotations-link"
            onClick={() => setEditingName(true)}
          >
            change
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="fs-annotations-error">
          {error}
        </p>
      )}
      <div className="fs-annotations-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={saving || !note.trim()}>
          {saving ? 'Posting…' : 'Reply'}
        </button>
      </div>
    </form>
  );
}

export function CommentMeta({ annotation }: { annotation: Annotation }) {
  return (
    <p className="fs-annotations-meta">
      <span className="fs-annotations-author">
        {annotation.authorName || 'Anonymous'}
      </span>{' '}
      ·{' '}
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
