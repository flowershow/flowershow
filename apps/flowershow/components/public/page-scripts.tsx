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
 * Instead we append plain classic `<script>` elements (`async = false` keeps
 * the listed order) after hydration and remove them on unmount.
 *
 * Insertion is deferred with `setTimeout(0)` and cancelled on unmount: this
 * avoids a double run under React StrictMode (mount, unmount, mount) and most
 * cases of a script starting after the reader has already navigated away.
 * Once a script element is inserted it fetches and runs even if removed, so
 * user scripts should still guard for their target elements.
 */
export function PageScripts({ srcs }: { srcs: string[] }) {
  const deps = srcs.join('\n');

  useEffect(() => {
    const list = deps ? deps.split('\n') : [];
    if (list.length === 0) return;

    const elements: HTMLScriptElement[] = [];
    const timer = setTimeout(() => {
      for (const src of list) {
        const el = document.createElement('script');
        el.src = src;
        el.async = false;
        el.dataset.flowershowPageScript = '';
        document.body.appendChild(el);
        elements.push(el);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      if (elements.length === 0) return;
      for (const el of elements) el.remove();
      // Lets page scripts tear down listeners/timers they set up.
      document.dispatchEvent(new Event(PAGE_LEAVE_EVENT));
    };
  }, [deps]);

  return null;
}
