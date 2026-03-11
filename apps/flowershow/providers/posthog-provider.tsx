'use client';

import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { env } from '@/env.mjs';

export function PostHogProvider({ children }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    const rawCookie = document.cookie.match(
      /(?:^|;\s*)ph_bootstrap=([^;]+)/,
    )?.[1];
    const bootstrapData = rawCookie
      ? JSON.parse(decodeURIComponent(rawCookie))
      : undefined;

    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: '/relay-qYYb',
      ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      persistence: 'cookie', // localStorage+cookie won't work across subdomains
      cross_subdomain_cookie: true,
      disable_web_experiments: false, // https://posthog.com/docs/experiments/no-code-web-experiments
      bootstrap: bootstrapData,
      disable_session_recording: true, // TODO temporary patch https://github.com/flowershow/flowershow/issues/1131
    });
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;

    if (status === 'authenticated' && userId) {
      posthog.identify(userId, {
        name: session.user.username,
        email: session.user.email,
      });
    }
  }, [session, status]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
