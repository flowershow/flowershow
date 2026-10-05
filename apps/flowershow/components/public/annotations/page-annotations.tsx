'use client';

import type {
  Annotation,
  AnnotationSelector,
  CreateAnnotationRequest,
  CreateAnnotationResponse,
  ListAnnotationsResponse,
} from '@flowershow/api-contract';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  anchorSelector,
  type DescribedSelection,
  describeRange,
  getRootText,
  rangeFromOffsets,
  textOffsetAt,
} from '@/lib/annotations/anchoring';
import { ANNOTATION_LIMITS } from '@/lib/annotations/limits';
import '@/styles/annotations.css';

const NAME_STORAGE_KEY = 'fs-annotator-name';
const HIGHLIGHT_NAME = 'fs-annotation';
/**
 * Injected at runtime, not kept in annotations.css: Turbopack's CSS parser (lightningcss) rejects
 * `::highlight()` and would fail the whole page route to compile.
 */
export const HIGHLIGHT_CSS =
  '::highlight(fs-annotation){background-color:color-mix(in srgb,var(--color-accent,#fb923c) 30%,transparent)}';
/** How long "Annotate" survives a collapsed selection, so a tap that collapses it still lands. */
const HIDE_DELAY_MS = 400;

type Placed = { annotation: Annotation; start: number; end: number };
type PendingSelection = DescribedSelection & { top: number; left: number };

export interface PageAnnotationsProps {
  siteId: string;
  /** Blob path of the page, e.g. `notes/draft.md`. */
  pagePath: string;
  /** Dashboard page where the site owner can manage annotations. */
  manageUrl: string;
  /** Id of the element holding the rendered Markdown. */
  rootId?: string;
}

function readStoredName(): string {
  try {
    return window.localStorage.getItem(NAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function storeName(name: string) {
  try {
    window.localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch {
    // storage blocked: the name just isn't remembered
  }
}

/** Run `fn` when the browser is idle (falls back to a short timeout). Returns a cancel function. */
function scheduleIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 50);
  return () => clearTimeout(id);
}

/** DOM position under a click, from whichever caret API the browser has. */
function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as unknown as {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) return { node: position.offsetNode, offset: position.offset };
  const range = doc.caretRangeFromPoint?.(x, y);
  return range
    ? { node: range.startContainer, offset: range.startOffset }
    : null;
}

export default function PageAnnotations({
  siteId,
  pagePath,
  manageUrl,
  rootId = 'mdxpage',
}: PageAnnotationsProps) {
  /** Mounted on a page that has the Markdown root to annotate (no root: render nothing). */
  const [hasRoot, setHasRoot] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [unplaced, setUnplaced] = useState<Annotation[]>([]);
  const [open, setOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<PendingSelection | null>(null);
  const [draft, setDraft] = useState<DescribedSelection | null>(null);
  const [note, setNote] = useState('');
  const [rememberedName, setRememberedName] = useState('');
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const placedRef = useRef<Placed[]>([]);

  const endpoint = `/api/sites/id/${encodeURIComponent(siteId)}/annotations`;

  useEffect(() => {
    setHasRoot(document.getElementById(rootId) !== null);
    setIsTouch(
      typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches,
    );
    const stored = readStoredName();
    setRememberedName(stored);
    setName(stored);
  }, [rootId]);

  // Load this page's annotations (the server records the page view).
  useEffect(() => {
    let cancelled = false;
    fetch(`${endpoint}?path=${encodeURIComponent(pagePath)}`, {
      credentials: 'same-origin',
    })
      .then((res) =>
        res.ok
          ? (res.json() as Promise<ListAnnotationsResponse>)
          : { annotations: [] },
      )
      .then((data) => {
        if (!cancelled) setAnnotations(data.annotations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [endpoint, pagePath]);

  const openAnnotations = annotations.filter((a) => a.status === 'open');
  const resolvedAnnotations = annotations.filter(
    (a) => a.status === 'resolved',
  );

  // Anchor open notes when they change, and again only if the page text changes (e.g. MDX hydration).
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    let lastText = '';
    const place = () => {
      const text = getRootText(root);
      lastText = text;
      const nextPlaced: Placed[] = [];
      const nextUnplaced: Annotation[] = [];
      for (const annotation of annotations) {
        if (annotation.status !== 'open') continue;
        const anchor = anchorSelector(text, annotation.selector);
        if (anchor) nextPlaced.push({ annotation, ...anchor });
        else nextUnplaced.push(annotation);
      }
      nextPlaced.sort((a, b) => a.start - b.start);
      placedRef.current = nextPlaced;
      setPlaced(nextPlaced);
      setUnplaced(nextUnplaced);
      paintHighlights(root, nextPlaced);
    };
    place();
    let cancelIdle: (() => void) | undefined;
    const observer = new MutationObserver(() => {
      cancelIdle?.();
      cancelIdle = scheduleIdle(() => {
        if (getRootText(root) !== lastText) place();
      });
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      cancelIdle?.();
      clearHighlights();
    };
  }, [annotations, rootId]);

  // Offer "Annotate" for any selection that touches the page body.
  useEffect(() => {
    const onSelectionChange = () => {
      const root = document.getElementById(rootId);
      const current = document.getSelection();
      const range =
        current && current.rangeCount > 0 && !current.isCollapsed
          ? current.getRangeAt(0)
          : null;
      const described = root && range ? describeRange(root, range) : null;
      clearTimeout(hideTimer.current);
      if (!described || !range) {
        hideTimer.current = setTimeout(() => setSelection(null), HIDE_DELAY_MS);
        return;
      }
      const rect =
        typeof range.getBoundingClientRect === 'function'
          ? range.getBoundingClientRect()
          : null;
      setSelection({
        ...described,
        top: (rect?.bottom ?? 0) + window.scrollY + 8,
        left: (rect?.left ?? 16) + window.scrollX,
      });
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      clearTimeout(hideTimer.current);
    };
  }, [rootId]);

  // Clicking highlighted text opens the panel at that note.
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.('a')) return;
      if (document.getSelection()?.isCollapsed === false) return;
      const point = caretAt(event.clientX, event.clientY);
      if (!point || !root.contains(point.node)) return;
      const offset = textOffsetAt(root, point.node, point.offset);
      const hit = placedRef.current.find(
        (item) => offset >= item.start && offset < item.end,
      );
      if (!hit) return;
      setFocusedId(hit.annotation.id);
      setOpen(true);
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [rootId]);

  useEffect(() => {
    if (open && focusedId)
      document
        .getElementById(`fs-annotation-${focusedId}`)
        ?.scrollIntoView?.({ block: 'nearest' });
  }, [open, focusedId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const startDraft = () => {
    if (!selection) return;
    setDraft({ selector: selection.selector, truncated: selection.truncated });
    setSelection(null);
    setEditingName(!rememberedName);
    setError(null);
    setOpen(true);
  };

  const cancelDraft = () => {
    setDraft(null);
    setNote('');
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || !note.trim()) return;
    setSaving(true);
    setError(null);
    const authorName = name.trim();
    const body: CreateAnnotationRequest = {
      path: pagePath,
      selector: draft.selector as AnnotationSelector,
      note: note.trim(),
      ...(authorName ? { authorName } : {}),
    };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message ?? 'Could not save the annotation.');
      }
      const data = (await res.json()) as CreateAnnotationResponse;
      setAnnotations((previous) => [...previous, data.annotation]);
      if (authorName) {
        storeName(authorName);
        setRememberedName(authorName);
      }
      cancelDraft();
      document.getSelection()?.removeAllRanges();
      if (isTouch) setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save the annotation.',
      );
    } finally {
      setSaving(false);
    }
  };

  const scrollTo = (item: Placed) => {
    setFocusedId(item.annotation.id);
    const root = document.getElementById(rootId);
    const range = root ? rangeFromOffsets(root, item.start, item.end) : null;
    range?.startContainer.parentElement?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'center',
    });
  };

  if (!hasRoot) return null;

  const count = openAnnotations.length;
  const noun = count === 1 ? 'note' : 'notes';
  const pillLabel = `Annotations on · ${count} ${noun} · select text to add one`;

  return createPortal(
    <>
      <style data-fs-annotations-highlight="">{HIGHLIGHT_CSS}</style>
      {/* A draft left in a closed panel must not block new selections: Annotate replaces its quote. */}
      {selection && !(open && draft) && (
        <button
          type="button"
          className={
            isTouch ? 'fs-annotations-add is-touch' : 'fs-annotations-add'
          }
          style={
            isTouch ? undefined : { top: selection.top, left: selection.left }
          }
          // Keep the text selection when the button is pressed.
          onMouseDown={(event) => event.preventDefault()}
          onPointerDown={(event) => event.preventDefault()}
          onClick={startDraft}
        >
          Annotate
        </button>
      )}
      <button
        type="button"
        className="fs-annotations-pill"
        aria-label={pillLabel}
        aria-expanded={open}
        aria-controls="fs-annotations-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {isTouch ? `${count} ${noun}` : pillLabel}
      </button>
      {open && (
        <aside
          id="fs-annotations-panel"
          className="fs-annotations-panel"
          aria-label="Annotations"
        >
          <div className="fs-annotations-header">
            <h2>Annotations</h2>
            <button
              type="button"
              className="fs-annotations-close"
              aria-label="Close annotations"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          {draft && (
            <form className="fs-annotations-form" onSubmit={submit}>
              <blockquote className="fs-annotations-quote">
                {truncate(draft.selector.exact, 280)}
              </blockquote>
              {draft.truncated && (
                <p className="fs-annotations-notice">
                  Only the first 1,000 characters of your selection will be
                  quoted.
                </p>
              )}
              <label>
                Note
                <textarea
                  name="note"
                  required
                  maxLength={ANNOTATION_LIMITS.note}
                  rows={4}
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
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
                  Posting as {rememberedName} ·{' '}
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
                <button type="submit" disabled={saving || !note.trim()}>
                  {saving ? 'Saving…' : 'Save annotation'}
                </button>
                <button type="button" onClick={cancelDraft}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {!draft && annotations.length === 0 && (
            <p className="fs-annotations-empty">
              Select text on the page and tap “Annotate” to leave a note. No
              account needed. Everyone who can view this page can see
              annotations.
            </p>
          )}
          {placed.length + unplaced.length > 0 && (
            <ol className="fs-annotations-list">
              {placed.map((item) => (
                <AnnotationItem
                  key={item.annotation.id}
                  annotation={item.annotation}
                  focused={item.annotation.id === focusedId}
                  onSelect={() => scrollTo(item)}
                />
              ))}
              {unplaced.map((annotation) => (
                <AnnotationItem
                  key={annotation.id}
                  annotation={annotation}
                  focused={annotation.id === focusedId}
                  outdated
                />
              ))}
            </ol>
          )}
          {resolvedAnnotations.length > 0 && (
            <ol className="fs-annotations-list fs-annotations-resolved">
              {resolvedAnnotations.map((annotation) => (
                <li
                  key={annotation.id}
                  id={`fs-annotation-${annotation.id}`}
                  className="fs-annotations-item"
                >
                  <details>
                    <summary>
                      ✓ Resolved: “{truncate(annotation.selector.exact, 60)}”
                    </summary>
                    <p className="fs-annotations-note">{annotation.note}</p>
                    <AnnotationMeta annotation={annotation} />
                  </details>
                </li>
              ))}
            </ol>
          )}
          <p className="fs-annotations-manage">
            <a href={manageUrl} target="_blank" rel="noopener noreferrer">
              Site owner? Manage annotations
            </a>
          </p>
        </aside>
      )}
    </>,
    document.body,
  );
}

function AnnotationItem({
  annotation,
  onSelect,
  outdated = false,
  focused = false,
}: {
  annotation: Annotation;
  onSelect?: () => void;
  outdated?: boolean;
  focused?: boolean;
}) {
  const quote = `“${truncate(annotation.selector.exact, 140)}”`;
  const className = [
    'fs-annotations-item',
    outdated && 'is-outdated',
    focused && 'is-focused',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <li id={`fs-annotation-${annotation.id}`} className={className}>
      {outdated && <span className="fs-annotations-badge">Outdated</span>}
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
      <AnnotationMeta annotation={annotation} />
    </li>
  );
}

function AnnotationMeta({ annotation }: { annotation: Annotation }) {
  return (
    <p className="fs-annotations-meta">
      {annotation.authorName || 'Anonymous'} ·{' '}
      <time dateTime={annotation.createdAt}>
        {formatDate(annotation.createdAt)}
      </time>
    </p>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// CSS Custom Highlight API: highlights without touching the React-owned DOM.
function paintHighlights(root: Element, placed: Placed[]) {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
  const ranges = placed
    .map((item) => rangeFromOffsets(root, item.start, item.end))
    .filter((range): range is Range => range !== null);
  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
}

function clearHighlights() {
  if (typeof CSS !== 'undefined' && 'highlights' in CSS)
    CSS.highlights.delete(HIGHLIGHT_NAME);
}
