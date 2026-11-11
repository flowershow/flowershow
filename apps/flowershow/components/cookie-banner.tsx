'use client';

import { env } from '@/env.mjs';

const isSecure =
  env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
const protocol = isSecure ? 'https' : 'http';

export function CookieBanner({
  onChoice,
}: {
  onChoice: (accepted: boolean) => void;
}) {
  return (
    // z-[110]: above the "Built with Flowershow" badge (z-index 100, pinned
    // inline with !important), which sits under the full-width banner on mobile.
    <section
      aria-label="Cookie consent"
      className="font-sans fixed inset-x-4 bottom-4 z-[110] rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-lg sm:right-auto sm:max-w-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    >
      <p className="font-medium text-zinc-900 dark:text-zinc-100">
        Help us make Flowershow better
      </p>
      <p className="mt-1">
        We&apos;d like to use cookies to see how people use Flowershow. No ads,
        and we never sell your data.{' '}
        <a
          href={`${protocol}://${env.NEXT_PUBLIC_HOME_DOMAIN}/privacy`}
          className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Privacy policy
        </a>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onChoice(false)}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          No thanks
        </button>
        <button
          type="button"
          onClick={() => onChoice(true)}
          className="flex-1 rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Accept
        </button>
      </div>
    </section>
  );
}
