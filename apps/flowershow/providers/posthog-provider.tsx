'use client';

import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { env } from '@/env.mjs';
import { redactClaimTokensInEvent } from '@/lib/redact-claim-token';

/** Identifies the signed-in user. Needs a SessionProvider above it. */
function IdentifyUser() {
  const { data: session, status } = useSession();

  useEffect(() => {
    const userId = session?.user?.id;

    if (status === 'authenticated' && userId) {
      posthog.identify(userId, {
        name: session.user.username,
        email: session.user.email,
      });
    }
  }, [session, status]);

  return null;
}

export function PostHogProvider({
  children,
  persistence = 'cookie',
  identify = true,
}: {
  children: React.ReactNode;
  /** 'memory' sets no cookies or storage (temporary sites). */
  persistence?: 'cookie' | 'memory';
  /** Identify the signed-in user (needs a SessionProvider). */
  identify?: boolean;
}) {
  useEffect(() => {
    const memory = persistence === 'memory';
    const rawCookie = memory
      ? undefined
      : document.cookie.match(/(?:^|;\s*)ph_bootstrap=([^;]+)/)?.[1];
    const bootstrapData = rawCookie
      ? JSON.parse(decodeURIComponent(rawCookie))
      : undefined;

    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: '/relay-qYYb',
      ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      // cookie: localStorage+cookie won't work across subdomains
      persistence,
      ...(memory ? {} : { cross_subdomain_cookie: true }),
      disable_web_experiments: false, // https://posthog.com/docs/experiments/no-code-web-experiments
      bootstrap: bootstrapData,
      disable_session_recording: true, // TODO temporary patch https://github.com/flowershow/flowershow/issues/1131
      // Claim links carry a bearer token; keep it out of $current_url etc.
      before_send: redactClaimTokensInEvent,
      loaded: (ph) => {
        // Expose PostHog on window so the PostHog Toolbar and the no-code
        // web-experiments visual editor can attach. The posthog-js/react npm
        // integration (unlike the HTML snippet) does not do this automatically.
        (window as unknown as { posthog?: typeof ph }).posthog = ph;
      },
    });
  }, [persistence]);

  return (
    <PHProvider client={posthog}>
      {identify && <IdentifyUser />}
      {children}
    </PHProvider>
  );
}
