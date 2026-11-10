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
    <section
      aria-label="Cookie consent"
      className="font-sans fixed inset-x-4 bottom-4 z-50 rounded-lg bg-gray-900 p-4 text-sm text-white shadow-lg sm:right-auto sm:max-w-sm dark:bg-gray-800"
    >
      <p>
        May we use analytics cookies to see how Flowershow is used? If you
        reject them, we only count visits, without cookies.{' '}
        <a
          href={`${protocol}://${env.NEXT_PUBLIC_HOME_DOMAIN}/privacy`}
          className="underline"
        >
          Privacy policy
        </a>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onChoice(true)}
          className="flex-1 rounded-md bg-white px-3 py-1.5 font-medium text-gray-900 hover:bg-gray-200"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => onChoice(false)}
          className="flex-1 rounded-md bg-white px-3 py-1.5 font-medium text-gray-900 hover:bg-gray-200"
        >
          Reject
        </button>
      </div>
    </section>
  );
}
