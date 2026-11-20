'use client';

import { XIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

interface SiteBannerProps {
  siteId: string;
  /** The raw banner text; used to detect when the owner changes the message. */
  text: string;
  /** The formatted banner text. */
  children: ReactNode;
  dismissible: boolean;
}

export const siteBannerStorageKey = (siteId: string) =>
  `site-banner-dismissed-${siteId}`;

/**
 * Owner-configured announcement bar above the navbar. A dismissal is stored
 * together with the text it dismissed, so editing the text shows the bar again
 * to everyone.
 */
export function SiteBanner({
  siteId,
  text,
  children,
  dismissible,
}: SiteBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Rendered on the server, so a visitor who dismissed it sees it flash for a
  // moment until hydration.
  useEffect(() => {
    if (!dismissible) return;
    try {
      setDismissed(localStorage.getItem(siteBannerStorageKey(siteId)) === text);
    } catch {
      // Storage unavailable (e.g. blocked cookies): just show the bar.
    }
  }, [siteId, text, dismissible]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(siteBannerStorageKey(siteId), text);
    } catch {
      // Not persisted; the bar stays closed until the next page load.
    }
  };

  if (dismissed) return null;

  return (
    <section
      data-testid="site-banner"
      aria-label="Announcement"
      className="font-heading relative flex items-center justify-center bg-gray-900 px-10 py-2.5 text-center text-sm text-white after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10 dark:bg-gray-800"
    >
      <p>{children}</p>
      {dismissible && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-white/80 hover:text-white"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      )}
    </section>
  );
}
