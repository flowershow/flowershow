import { reportAbuseUrl } from '@/lib/anon-site-safety';

/**
 * Thin notice shown to every visitor of an anonymous (unclaimed) site's
 * rendered pages (flowershow-ctv). Raw .html pages get the same text injected
 * at serve time instead (see lib/anon-site-safety).
 */
export function AnonSiteNotice({ siteUrl }: { siteUrl: string }) {
  return (
    <div
      data-testid="anon-site-notice"
      role="note"
      className="font-heading flex flex-wrap items-center justify-center gap-x-2 bg-gray-100 px-4 py-1.5 text-xs text-gray-700 dark:bg-zinc-900 dark:text-zinc-300"
    >
      <span>Published anonymously with Flowershow</span>
      <span aria-hidden="true">·</span>
      <a
        href={reportAbuseUrl(`${siteUrl}/`)}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        Report abuse
      </a>
    </div>
  );
}
