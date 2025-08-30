// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
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
  sendDefaultPii: true,
  enabled: isProd || isPreview,
  environment: env,
  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Adjust sampling rates based on environment
  tracesSampleRate: isProd ? 0.1 : 1.0,
  enableLogs: true,
  // Higher replay sampling in development for better debugging
  replaysSessionSampleRate: isProd ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  debug: !isProd,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
