// Site analytics config. Constants live in code, not env vars; only the
// Umami API key is a secret (UMAMI_API_KEY).

// Our self-hosted Umami and its one "Flowershow Users" website.
export const UMAMI_HOST = 'https://umami.lifeitself.org';
export const UMAMI_WEBSITE_ID = '087a94f4-913b-4143-9894-6b442c4ebe1a';

// Give up on an Umami request after this long.
export const UMAMI_TIMEOUT_MS = 5000;

// Numbers only count from this date (launch day).
export const ANALYTICS_COUNTING_SINCE = new Date('2026-11-12T00:00:00Z');

export const ANALYTICS_RANGES = [7, 30] as const;
export type AnalyticsRange = 7 | 30;
export const DEFAULT_RANGE: AnalyticsRange = 30;

// How long Umami responses are cached.
export const ANALYTICS_CACHE_SECONDS = 600;
