'use client';

import type {
  Annotation,
  AnnotationSelector,
  CreateAnnotationRequest,
  CreateAnnotationResponse,
  ListAnnotationsResponse,
} from '@flowershow/api-contract';
import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import { CommentItem, CommentMeta, truncate } from './comment-item';
import { CommentsBar, PANEL_ID } from './comments-bar';
import '@/styles/annotations.css';

const NAME_STORAGE_KEY = 'fs-annotator-name';
const HIGHLIGHT_NAME = 'fs-annotation';
const ACTIVE_HIGHLIGHT_NAME = 'fs-annotation-active';
/** Set on <html> while the panel is open; annotations.css docks the panel and narrows the page at >=1280px. */
export const OPEN_CLASS = 'fs-comments-open';
/**
 * Injected at runtime, not kept in annotations.css: Turbopack's CSS parser (lightningcss) rejects
 * `::highlight()` and would fail the whole page route to compile.
 */
export const HIGHLIGHT_CSS =
  '::highlight(fs-annotation){background-color:color-mix(in srgb,var(--color-accent,#fb923c) 30%,transparent)}' +
  '::highlight(fs-annotation-active){background-color:color-mix(in srgb,var(--color-accent,#fb923c) 60%,transparent)}';
/** How long "Comment" survives a collapsed selection, so a tap that collapses it still lands. */
const HIDE_DELAY_MS = 400;
/** Rough size of the floating "Comment" button, for keeping it inside the viewport. */
const ADD_BUTTON = { width: 110, height: 36, gap: 8, margin: 8 };
/** Phones get a bottom sheet instead of a side panel (same breakpoint as annotations.css). */
export const SHEET_QUERY = '(max-width: 767px)';
/** At this width the panel docks beside the page (same breakpoint as annotations.css). */
const DOCKED_QUERY = '(min-width: 1280px)';
/** The "Built with Flowershow" badge pins its own inline styles with !important, so CSS can't move it. */
const BUILT_WITH_ID = 'built-with-button';
/** How far a downward swipe on the sheet's header must travel to close it. */
const SWIPE_CLOSE_PX = 60;

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

/**
 * Viewport position for the floating "Comment" button: below the selection, or above it
 * when there's no room below, and never past the left/right edges (1pr.6).
 */
export function placeAddButton(
  rect: { top: number; bottom: number; left: number },
  viewport: { width: number; height: number },
): { top: number; left: number } {
  const { width, height, gap, margin } = ADD_BUTTON;
  let top = rect.bottom + gap;
  if (top + height > viewport.height - margin)
    top = Math.max(margin, rect.top - height - gap);
  const left = Math.max(
    margin,
    Math.min(rect.left, viewport.width - width - margin),
  );
  return { top, left };
}

/**
 * Height the comments bar must clear: the site navbar when it stays on screen
 * (sticky or fixed), else 0. Measured because themes size the navbar themselves.
 */
function measureNavbar(): { height: number; fixed: boolean } {
  const nav = document.querySelector<HTMLElement>('.site-navbar');
  if (!nav) return { height: 0, fixed: false };
  const style = window.getComputedStyle(nav);
  if (
    style.display === 'none' ||
    (style.position !== 'sticky' && style.position !== 'fixed')
  )
    return { height: 0, fixed: false };
  return {
    height: nav.getBoundingClientRect().height,
    fixed: style.position === 'fixed',
  };
}

/**
 * With the bottom sheet open (lower ~58% of the screen), scroll the page so `range`
 * starts a quarter of the way down the viewport: clear of sticky headers (navbar,
 * sidebar subnav) and above the sheet.
 */
export function revealAboveSheet(range: Range | null) {
  if (!range || typeof range.getBoundingClientRect !== 'function') return;
  const top = range.getBoundingClientRect().top;
  const target = Math.max(
    measureNavbar().height + 16,
    window.innerHeight * 0.25,
  );
  window.scrollTo({
    top: Math.max(0, window.scrollY + top - target),
    behavior: 'smooth',
  });
}

export default function PageAnnotations({
  siteId,
  pagePath,
  manageUrl,
  rootId = 'mdxpage',
}: PageAnnotationsProps) {
  /** Client-only parts (panel, button, highlights) wait for mount; the bar renders on the server. */
  const [mounted, setMounted] = useState(false);
  /** The page has the Markdown root to annotate (no root: render nothing). */
  const [hasRoot, setHasRoot] = useState(true);
  const [isTouch, setIsTouch] = useState(false);
  /** Phone layout: the panel is a bottom sheet. */
  const [isSheet, setIsSheet] = useState(false);
  const isSheetRef = useRef(false);
  /** A fixed (out-of-flow) navbar's height: the bar is pushed below it. */
  const [fixedNavHeight, setFixedNavHeight] = useState(0);
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
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  /** Where focus goes back to when the panel closes (1pr.6). */
  const returnFocusRef = useRef<HTMLElement | null>(null);
  /** Move focus into the panel once it renders (opened from the bar, not the composer). */
  const focusPanelRef = useRef(false);
  /** Where a swipe on the sheet's header started. */
  const swipeStartRef = useRef<number | null>(null);

  const endpoint = `/api/sites/id/${encodeURIComponent(siteId)}/annotations`;

  useEffect(() => {
    setMounted(true);
    setHasRoot(document.getElementById(rootId) !== null);
    setIsTouch(
      typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches,
    );
    const stored = readStoredName();
    setRememberedName(stored);
    setName(stored);
  }, [rootId]);

  // Track the phone breakpoint: below it the panel is a bottom sheet.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(SHEET_QUERY);
    const update = () => {
      isSheetRef.current = query.matches;
      setIsSheet(query.matches);
    };
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  // Keep the bar (and the docked panel) just under the navbar, whatever the theme makes it.
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const nav = measureNavbar();
      root.style.setProperty('--fs-comments-top', `${nav.height}px`);
      setFixedNavHeight(nav.fixed ? nav.height : 0);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      root.style.removeProperty('--fs-comments-top');
    };
  }, []);

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

  // The focused comment's passage gets a stronger highlight while the panel is open.
  useEffect(() => {
    const root = document.getElementById(rootId);
    const active = open
      ? placed.find((item) => item.annotation.id === focusedId)
      : undefined;
    if (!root || !active) {
      paintActive(null);
      return;
    }
    paintActive(rangeFromOffsets(root, active.start, active.end));
    return () => paintActive(null);
  }, [open, focusedId, placed, rootId]);

  // Offer "Comment" for any selection that touches the page body.
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
      const position = placeAddButton(
        {
          top: rect?.top ?? 0,
          bottom: rect?.bottom ?? 0,
          left: rect?.left ?? 16,
        },
        { width: window.innerWidth, height: window.innerHeight },
      );
      setSelection({
        ...described,
        top: position.top + window.scrollY,
        left: position.left + window.scrollX,
      });
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      clearTimeout(hideTimer.current);
    };
  }, [rootId]);

  // Clicking highlighted text opens the panel at that comment.
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
      if (isSheetRef.current) {
        // Phone: the sheet takes the bottom of the screen, so lift the passage above it.
        focusPanelRef.current = true;
        revealAboveSheet(rangeFromOffsets(root, hit.start, hit.end));
      }
      setOpen(true);
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [rootId]);

  // Bring the focused comment into view, unless the composer (top of the panel) is open.
  const drafting = draft !== null;
  useEffect(() => {
    if (open && focusedId && !drafting)
      document
        .getElementById(`fs-annotation-${focusedId}`)
        ?.scrollIntoView?.({ block: 'nearest' });
  }, [open, focusedId, drafting]);

  // While open: dock the panel (CSS on <html>), close on Escape, and hand focus back on close.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const panel = panelRef.current;
    html.classList.add(OPEN_CLASS);
    if (focusPanelRef.current) {
      focusPanelRef.current = false;
      panel?.focus({ preventScroll: true });
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const unshiftBadge = shiftBuiltWithBadge();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unshiftBadge();
      html.classList.remove(OPEN_CLASS);
      // The toggle may only exist once the panel has opened, so read it now.
      returnFocus(panel, returnFocusRef, toggleRef);
    };
  }, [open]);

  // Phone sheet: keep it above the on-screen keyboard (the visual viewport shrinks, the layout one doesn't).
  useEffect(() => {
    const panel = panelRef.current;
    const viewport = window.visualViewport;
    if (!open || !isSheet || !panel || !viewport) return;
    const update = () => {
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      panel.style.setProperty('--fs-keyboard-inset', `${inset}px`);
      panel.style.setProperty('--fs-visible-height', `${viewport.height}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [open, isSheet]);

  const togglePanel = () => {
    if (open) {
      setOpen(false);
      return;
    }
    returnFocusRef.current = toggleRef.current;
    focusPanelRef.current = true;
    setOpen(true);
  };

  const startDraft = () => {
    if (!selection) return;
    if (isSheetRef.current) {
      const current = document.getSelection();
      revealAboveSheet(
        current && current.rangeCount > 0 ? current.getRangeAt(0) : null,
      );
    }
    setDraft({ selector: selection.selector, truncated: selection.truncated });
    setSelection(null);
    // The composer takes focus, not the panel.
    focusPanelRef.current = false;
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
    if (!draft || !note.trim() || saving) return;
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
        throw new Error(data.message ?? 'Could not save the comment.');
      }
      const data = (await res.json()) as CreateAnnotationResponse;
      setAnnotations((previous) => [...previous, data.annotation]);
      setFocusedId(data.annotation.id);
      if (authorName) {
        storeName(authorName);
        setRememberedName(authorName);
      }
      cancelDraft();
      document.getSelection()?.removeAllRanges();
      if (isTouch) setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save the comment.',
      );
    } finally {
      setSaving(false);
    }
  };

  // ⌘/Ctrl+Enter posts from the textarea.
  const onNoteKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const scrollTo = (item: Placed) => {
    setFocusedId(item.annotation.id);
    const root = document.getElementById(rootId);
    const range = root ? rangeFromOffsets(root, item.start, item.end) : null;
    if (isSheetRef.current) {
      revealAboveSheet(range);
      return;
    }
    range?.startContainer.parentElement?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'center',
    });
  };

  if (!hasRoot) return null;

  const count = openAnnotations.length;

  return (
    <>
      <CommentsBar
        count={count}
        open={open}
        onToggle={togglePanel}
        toggleRef={toggleRef}
        style={fixedNavHeight ? { marginTop: fixedNavHeight } : undefined}
      />
      {mounted &&
        createPortal(
          <>
            <style data-fs-annotations-highlight="">{HIGHLIGHT_CSS}</style>
            {/* A draft left in a closed panel must not block new selections: Comment replaces its quote. */}
            {selection && !(open && draft) && (
              <button
                type="button"
                className={
                  isTouch ? 'fs-annotations-add is-touch' : 'fs-annotations-add'
                }
                style={
                  isTouch
                    ? undefined
                    : { top: selection.top, left: selection.left }
                }
                // Keep the text selection when the button is pressed.
                onMouseDown={(event) => event.preventDefault()}
                onPointerDown={(event) => event.preventDefault()}
                onClick={startDraft}
              >
                Comment
              </button>
            )}
            {open && (
              <aside
                ref={panelRef}
                id={PANEL_ID}
                className={
                  isSheet
                    ? 'fs-annotations-panel is-sheet'
                    : 'fs-annotations-panel'
                }
                // Phones: a non-modal sheet over the bottom of the page.
                role={isSheet ? 'dialog' : undefined}
                aria-modal={isSheet ? false : undefined}
                aria-label="Comments"
                tabIndex={-1}
              >
                <div
                  className="fs-annotations-header"
                  // Swipe down on the sheet's header to close it.
                  onTouchStart={(event) => {
                    swipeStartRef.current = isSheet
                      ? (event.touches[0]?.clientY ?? null)
                      : null;
                  }}
                  onTouchEnd={(event) => {
                    const start = swipeStartRef.current;
                    swipeStartRef.current = null;
                    const end = event.changedTouches[0]?.clientY;
                    if (
                      start !== null &&
                      end !== undefined &&
                      end - start > SWIPE_CLOSE_PX
                    )
                      setOpen(false);
                  }}
                >
                  {isSheet && (
                    <span
                      className="fs-annotations-handle"
                      aria-hidden="true"
                    />
                  )}
                  <h2>Comments{count > 0 && <span> ({count})</span>}</h2>
                  <button
                    type="button"
                    className="fs-annotations-close"
                    aria-label="Close comments"
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="fs-annotations-body">
                  {draft && (
                    <form className="fs-annotations-form" onSubmit={submit}>
                      <blockquote className="fs-annotations-quote">
                        {truncate(draft.selector.exact, 280)}
                      </blockquote>
                      {draft.truncated && (
                        <p className="fs-annotations-notice">
                          Only the first 1,000 characters of your selection will
                          be quoted.
                        </p>
                      )}
                      <textarea
                        name="note"
                        aria-label="Comment"
                        placeholder="Add a comment…"
                        required
                        maxLength={ANNOTATION_LIMITS.note}
                        rows={3}
                        autoFocus
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={onNoteKeyDown}
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
                        <button type="button" onClick={cancelDraft}>
                          Cancel
                        </button>
                        <button type="submit" disabled={saving || !note.trim()}>
                          {saving ? 'Posting…' : 'Post'}
                        </button>
                      </div>
                    </form>
                  )}
                  {!draft && annotations.length === 0 && (
                    <p className="fs-annotations-empty">
                      Select text on the page and choose “Comment” to leave one.
                      No account needed. Everyone who can view this page can see
                      comments.
                    </p>
                  )}
                  {placed.length > 0 && (
                    <ol className="fs-annotations-list">
                      {placed.map((item) => (
                        <CommentItem
                          key={item.annotation.id}
                          annotation={item.annotation}
                          focused={item.annotation.id === focusedId}
                          onSelect={() => scrollTo(item)}
                        />
                      ))}
                    </ol>
                  )}
                  {unplaced.length > 0 && (
                    <details className="fs-annotations-group">
                      <summary>Not found on page ({unplaced.length})</summary>
                      <ol className="fs-annotations-list">
                        {unplaced.map((annotation) => (
                          <CommentItem
                            key={annotation.id}
                            annotation={annotation}
                            focused={annotation.id === focusedId}
                          />
                        ))}
                      </ol>
                    </details>
                  )}
                  {resolvedAnnotations.length > 0 && (
                    <details className="fs-annotations-group fs-annotations-resolved">
                      <summary>Resolved ({resolvedAnnotations.length})</summary>
                      <ol className="fs-annotations-list">
                        {resolvedAnnotations.map((annotation) => (
                          <li
                            key={annotation.id}
                            id={`fs-annotation-${annotation.id}`}
                            className="fs-annotations-item"
                          >
                            <blockquote className="fs-annotations-quote">
                              “{truncate(annotation.selector.exact, 140)}”
                            </blockquote>
                            <p className="fs-annotations-note">
                              {annotation.note}
                            </p>
                            <CommentMeta annotation={annotation} />
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
                <p className="fs-annotations-manage">
                  <a href={manageUrl} target="_blank" rel="noopener noreferrer">
                    Site owner? Manage comments
                  </a>
                </p>
              </aside>
            )}
          </>,
          document.body,
        )}
    </>
  );
}

/**
 * After the panel closes, put focus back on what opened it (or the bar's toggle),
 * but only if focus was in the panel or got lost with it, not if the reader moved on.
 */
function returnFocus(
  panel: HTMLElement | null,
  opener: { current: HTMLElement | null },
  toggle: { current: HTMLElement | null },
) {
  const target = opener.current?.isConnected ? opener.current : toggle.current;
  opener.current = null;
  const active = document.activeElement;
  if (
    !active ||
    active === document.body ||
    !active.isConnected ||
    panel?.contains(active)
  )
    target?.focus({ preventScroll: true });
}

/**
 * While the docked panel is open, move the fixed "Built with Flowershow" badge left of
 * it so it doesn't sit on the panel's footer. Below the docked width the panel/sheet
 * stacks above the badge, so it stays put. Returns a function that undoes the shift.
 */
function shiftBuiltWithBadge(): () => void {
  const badge = document.getElementById(BUILT_WITH_ID);
  if (!badge || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DOCKED_QUERY);
  const original = {
    value: badge.style.getPropertyValue('right'),
    priority: badge.style.getPropertyPriority('right'),
  };
  const restore = () =>
    badge.style.setProperty('right', original.value, original.priority);
  const update = () => {
    if (query.matches)
      badge.style.setProperty(
        'right',
        'calc(var(--fs-comments-panel-width, 20rem) + 2rem)',
        'important',
      );
    else restore();
  };
  update();
  query.addEventListener?.('change', update);
  return () => {
    query.removeEventListener?.('change', update);
    restore();
  };
}

// CSS Custom Highlight API: highlights without touching the React-owned DOM.
function paintHighlights(root: Element, placed: Placed[]) {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
  const ranges = placed
    .map((item) => rangeFromOffsets(root, item.start, item.end))
    .filter((range): range is Range => range !== null);
  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
}

function paintActive(range: Range | null) {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
  if (range) CSS.highlights.set(ACTIVE_HIGHLIGHT_NAME, new Highlight(range));
  else CSS.highlights.delete(ACTIVE_HIGHLIGHT_NAME);
}

function clearHighlights() {
  if (typeof CSS !== 'undefined' && 'highlights' in CSS)
    CSS.highlights.delete(HIGHLIGHT_NAME);
}
