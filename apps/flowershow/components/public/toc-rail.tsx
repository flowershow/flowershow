'use client';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  flattenToc,
  type TocSection,
  useTableOfContents,
  useTocHeadings,
} from './table-of-contents';

type RailItem = { id: string; title: string; depth: 0 | 1 };

const OUTLINE_ID = 'toc-rail-outline';
const CLOSE_DELAY_MS = 300;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Maps a (possibly deeper) current section id to the nearest ancestor shown in the rail. */
export function railCurrentId(
  sections: TocSection[],
  currentId: string | undefined,
  maxDepth = 2,
): string | null {
  if (!currentId) return null;
  const find = (list: TocSection[], depth: number, shown: string | null) => {
    for (const s of list) {
      const nextShown = depth < maxDepth ? s.id : shown;
      if (s.id === currentId) return nextShown;
      const found = s.children?.length
        ? find(s.children, depth + 1, nextShown)
        : null;
      if (found) return found;
    }
    return null;
  };
  return find(sections, 0, null);
}

/**
 * Page contents as a column of ticks; hovering or focusing it opens the outline
 * (WAI disclosure navigation pattern). Touch taps toggle it.
 */
export function TocRailView({
  items,
  currentId,
  side = 'right',
}: {
  items: RailItem[];
  currentId: string | null;
  /** Which side of the text the rail sits on; the outline opens towards the text */
  side?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ticksRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pointer type of the last pointerdown, so the click/focus it causes can tell touch from mouse
  const pointerType = useRef<string | null>(null);
  // Set when we move focus to the button ourselves (Escape), so that focus doesn't reopen
  const suppressFocusOpen = useRef(false);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  // Flag a tick list taller than the screen so CSS can fade its bottom edge
  useEffect(() => {
    const ticks = ticksRef.current;
    if (!ticks) return;
    const update = () => {
      ticks.dataset.overflow =
        ticks.scrollHeight > ticks.clientHeight ? 'true' : 'false';
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [items.length]);

  // Tap (or click) outside closes
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  if (items.length < 3) return null;

  const currentIndex = currentId
    ? items.findIndex((item) => item.id === currentId)
    : -1;
  const marks = (item: RailItem, index: number) => ({
    'data-depth': item.depth,
    'data-current': index === currentIndex ? '' : undefined,
  });

  const onLinkClick = (e: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    const heading = document.getElementById(id);
    if (!heading) return;
    e.preventDefault();
    heading.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
    history.replaceState(null, '', `#${id}`);
    close();
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  };

  return (
    <nav
      ref={navRef}
      className="toc-rail"
      aria-label="Contents"
      data-open={open ? 'true' : 'false'}
      data-side={side}
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'touch') return;
        cancelClose();
        closeTimer.current = setTimeout(() => {
          // Focus inside keeps it open; blur closes it once focus leaves
          if (navRef.current?.contains(document.activeElement)) return;
          close();
        }, CLOSE_DELAY_MS);
      }}
      onFocus={() => {
        if (suppressFocusOpen.current) {
          suppressFocusOpen.current = false;
          return;
        }
        // A tap focuses the button before its click; let the click toggle instead
        if (pointerType.current === 'touch') return;
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!navRef.current?.contains(e.relatedTarget as Node | null)) close();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return;
        e.preventDefault();
        close();
        suppressFocusOpen.current = true;
        buttonRef.current?.focus();
        // If focus was already on the button, no focus event consumed the flag
        suppressFocusOpen.current = false;
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="toc-rail-button"
        aria-expanded={open}
        aria-controls={OUTLINE_ID}
        aria-label="Contents"
        onPointerDown={(e) => {
          pointerType.current = e.pointerType;
        }}
        onPointerCancel={() => {
          pointerType.current = null;
        }}
        onClick={(e) => {
          // Touch and keyboard (detail 0) toggle; hover has already opened it for a mouse
          const toggles = pointerType.current === 'touch' || e.detail === 0;
          pointerType.current = null;
          setOpen((wasOpen) => (toggles ? !wasOpen : true));
        }}
      >
        <span ref={ticksRef} className="toc-rail-ticks" aria-hidden="true">
          {items.map((item, i) => (
            <span
              key={item.id}
              className="toc-rail-tick"
              {...marks(item, i)}
              data-read={i < currentIndex ? '' : undefined}
            />
          ))}
        </span>
      </button>
      <div className="toc-rail-outline" id={OUTLINE_ID} hidden={!open}>
        <ol>
          {items.map((item, i) => (
            <li key={item.id} {...marks(item, i)}>
              <a href={`#${item.id}`} onClick={(e) => onLinkClick(e, item.id)}>
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

export default function TocRail({
  side = 'right',
}: {
  side?: 'left' | 'right';
} = {}) {
  const sections = useTocHeadings();
  const currentSection = useTableOfContents(sections);
  const items = useMemo(() => flattenToc(sections), [sections]);
  const currentId = railCurrentId(sections, currentSection);

  return <TocRailView items={items} currentId={currentId} side={side} />;
}
