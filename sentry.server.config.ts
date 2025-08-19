// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const env =
  process.env.SENTRY_ENVIRONMENT ??
  process.env.VERCEL_ENV ??
  process.env.NODE_ENV ??
  "development";

const isProd = env === "production";
const isPreview = env === "preview";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: isProd || isPreview,
  environment: env,
  tracesSampleRate: isProd ? 0.1 : 1.0,
  debug: !isProd,
  beforeSend(event, hint) {
    const err = hint?.originalException as any;
    const digest = err?.digest ?? (event as any)?.extra?.digest;

    // Ignore Next.js “expected” navigation errors
    if (
      typeof digest === "string" &&
      (digest.startsWith("NEXT_NOT_FOUND") ||
        digest.startsWith("NEXT_REDIRECT"))
    ) {
      return null;
    }

    // Optional extra guard if your messages read literally "Page not found"
    const msg = err?.message || event.logentry?.message || event.message || "";
    if (typeof msg === "string" && /page not found/i.test(msg)) {
      return null;
    }

    return event;
  },
});
