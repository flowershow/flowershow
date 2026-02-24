import "dotenv/config";

export const API_URL = process.env.API_URL || "https://cloud.flowershow.app";
export const APP_URL = process.env.APP_URL || "https://my.flowershow.app";
export const POSTHOG_API_KEY =
  process.env.POSTHOG_API_KEY || "phc_QsAoymFdEUOjN9mv1yhWBXkVtbMNHTfbhJhnrzUlkke";
export const POSTHOG_HOST =
  process.env.POSTHOG_HOST || "https://eu.i.posthog.com";
