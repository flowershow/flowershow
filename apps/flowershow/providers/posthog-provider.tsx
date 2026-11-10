'use client';

import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, useState } from 'react';
import { CookieBanner } from '@/components/cookie-banner';
import { env } from '@/env.mjs';
import { redactClaimTokensInEvent } from '@/lib/redact-claim-token';

// Links to this hash (e.g. on the privacy page) reopen the cookie banner.
const COOKIE_SETTINGS_HASH = '#cookie-settings';

type ConsentStatus = 'granted' | 'denied' | 'pending';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  // null on published sites: they never ask, because nothing is stored.
  const [consent, setConsent] = useState<ConsentStatus | null>(null);

  useEffect(() => {
    // flowershow.app and the dashboard use PostHog cookies once the visitor
    // accepts them (cookieless counting if they reject; nothing is captured
    // until they choose). Published sites never store anything in the
    // browser: PostHog counts visitors with a daily-salted server-side hash.
    const { host } = window.location;
    const asksConsent =
      host === env.NEXT_PUBLIC_HOME_DOMAIN ||
      host === env.NEXT_PUBLIC_CLOUD_DOMAIN;

    const rawCookie = document.cookie.match(
      /(?:^|;\s*)ph_bootstrap=([^;]+)/,
    )?.[1];
    const bootstrapData = rawCookie
      ? JSON.parse(decodeURIComponent(rawCookie))
      : undefined;

    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: '/relay-qYYb',
      ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      cookieless_mode: asksConsent ? 'on_reject' : 'always',
      persistence: 'cookie', // localStorage+cookie won't work across subdomains
      cross_subdomain_cookie: true,
      // Keep the consent choice in a cookie too, so it is shared between
      // flowershow.app and cloud.flowershow.app.
      opt_out_capturing_persistence_type: 'cookie',
      disable_web_experiments: false, // https://posthog.com/docs/experiments/no-code-web-experiments
      bootstrap: bootstrapData,
      disable_session_recording: true, // TODO temporary patch https://github.com/flowershow/flowershow/issues/1131
      // Claim links carry a bearer token; keep it out of $current_url etc.
      before_send: redactClaimTokensInEvent,
      loaded: (ph) => {
        // Expose PostHog on window so the PostHog Toolbar and the no-code
        // web-experiments visual editor can attach. The posthog-js/react npm
        // integration (unlike the HTML snippet) does not do this automatically.
        Object.assign(window, { posthog: ph });
      },
    });

    if (!asksConsent) return;

    const syncConsent = () =>
      setConsent(
        window.location.hash === COOKIE_SETTINGS_HASH
          ? 'pending'
          : posthog.get_explicit_consent_status(),
      );
    syncConsent();
    window.addEventListener('hashchange', syncConsent);
    return () => window.removeEventListener('hashchange', syncConsent);
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;

    // Identify only with consent: a persistent ID is what the visitor agreed to.
    if (consent === 'granted' && status === 'authenticated' && userId) {
      posthog.identify(userId, {
        name: session.user.username,
        email: session.user.email,
      });
    }
  }, [session, status, consent]);

  const choose = (accepted: boolean) => {
    if (accepted) {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
      // It carries the accepted visitor's distinct ID; it must not outlive the choice.
      document.cookie = 'ph_bootstrap=; Max-Age=0; path=/';
    }
    if (window.location.hash === COOKIE_SETTINGS_HASH) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      );
    }
    setConsent(accepted ? 'granted' : 'denied');
  };

  return (
    <PHProvider client={posthog}>
      {children}
      {consent === 'pending' && <CookieBanner onChoice={choose} />}
    </PHProvider>
  );
}
