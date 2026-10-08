'use client';

import { useEffect } from 'react';

/** Dispatched on `document` when a page that loaded page scripts is left. */
export const PAGE_LEAVE_EVENT = 'flowershow:page-leave';

/**
 * Loads a page's `scripts` frontmatter (Premium) once per page view.
 *
 * `srcs` must already be resolved and validated on the server
 * (`resolvePageScripts`). Render this after the page content and key it by
 * page so every visit (hard load or client-side navigation) mounts a fresh
 * instance.
 *
 * Not `next/script`: it dedupes by `src` for the lifetime of the document, so
 * a script would not run again when the reader navigates back to the page.
 * Instead we append plain classic `<script>` elements after hydration and
 * remove them on unmount.
 *
 * Scripts are loaded one at a time, in the listed order: script i+1 is
 * inserted from script i's `load`/`error` handler, and the chain stops when
 * the page is left. Not `async = false`: that puts every page's scripts in one
 * document-wide ordered queue that removing an element doesn't cancel, so a
 * hung script on a page the reader already left would block the next page's
 * scripts, and a fast A→B→A could run A's scripts twice.
 *
 * Insertion is deferred with `setTimeout(0)` and cancelled on unmount: this
 * avoids a double run under React StrictMode (mount, unmount, mount). A script
 * that is already being fetched when the page is left still runs (removing it
 * doesn't cancel it), so user scripts should check
 * `document.currentScript?.isConnected` before doing anything.
 */
export function PageScripts({ srcs }: { srcs: string[] }) {
  const deps = srcs.join('\n');

  useEffect(() => {
    const list = deps ? deps.split('\n') : [];
    if (list.length === 0) return;

    let cancelled = false;
    const elements: HTMLScriptElement[] = [];

    const loadNext = (index: number) => {
      if (cancelled || index >= list.length) return;
      const el = document.createElement('script');
      el.src = list[index]!;
      el.async = true;
      el.dataset.flowershowPageScript = '';
      const next = () => loadNext(index + 1);
      el.addEventListener('load', next, { once: true });
      el.addEventListener('error', next, { once: true });
      document.body.appendChild(el);
      elements.push(el);
    };

    const timer = setTimeout(() => loadNext(0), 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (elements.length === 0) return;
      for (const el of elements) el.remove();
      // Lets page scripts tear down listeners/timers they set up.
      document.dispatchEvent(new Event(PAGE_LEAVE_EVENT));
    };
  }, [deps]);

  return null;
}
