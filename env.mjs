import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string() : z.string().url(),
    ),
    POSTGRES_PRISMA_URL: z.string().url(),
    POSTGRES_URL_NON_POOLING: z.string().url(),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_GITHUB_SECRET: z.string(),
    AUTH_BEARER_TOKEN: z.string().optional(),
    PROJECT_ID_VERCEL: z.string().optional(),
    TEAM_ID_VERCEL: z.string().optional(),
    VERCEL_URL: z.string().optional(),
    PORT: z.string().optional(),
    S3_ENDPOINT: z.string(),
    S3_ACCESS_KEY_ID: z.string(),
    S3_SECRET_ACCESS_KEY: z.string(),
    S3_BUCKET_NAME: z.string(),
    S3_REGION: z.string().default("auto"),
    S3_FORCE_PATH_STYLE: z
      .enum(["true", "false"])
      .default("false")
      .transform((val) => val === "true"),
    GH_WEBHOOK_SECRET: z.string(),
    GH_WEBHOOK_URL: z.string(),
    GH_ACCESS_TOKEN: z.string(),
    GTM_ID: z.string(),
    BREVO_API_KEY: z.string(),
    BREVO_CONTACT_LISTID: z.string(),
    TURNSTILE_SECRET_KEY: z.string(),
    INNGEST_APP_ID: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    STRIPE_PREMIUM_MONTHLY_PRICE_ID: z.string(),
    STRIPE_PREMIUM_YEARLY_PRICE_ID: z.string(),
    E2E_GH_USERNAME: z.string().optional(),
    E2E_GH_PASSWORD: z.string().optional(),
    TYPESENSE_ADMIN_API_KEY: z.string(),
    SENTRY_ORG: z.string(),
    SENTRY_PROJECT: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_AUTH_GITHUB_ID: z.string(),
    NEXT_PUBLIC_ROOT_DOMAIN: z.string(),
    NEXT_PUBLIC_CLOUD_DOMAIN: z.string(),
    NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX: z.string(),
    NEXT_PUBLIC_VERCEL_ENV: z.string().optional(),
    NEXT_PUBLIC_DNS_DOMAIN: z.string(),
    NEXT_PUBLIC_S3_BUCKET_DOMAIN: z.string(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string(),
    NEXT_PUBLIC_TYPESENSE_CLIENT_API_KEY: z.string(),
    NEXT_PUBLIC_TYPESENSE_HOST: z.string(),
    NEXT_PUBLIC_TYPESENSE_PORT: z.string(),
    NEXT_PUBLIC_TYPESENSE_PROTOCOL: z.string(),
    NEXT_PUBLIC_SENTRY_DSN: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    NEXT_PUBLIC_CLOUD_DOMAIN: process.env.NEXT_PUBLIC_CLOUD_DOMAIN,
    NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX:
      process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_AUTH_GITHUB_ID: process.env.NEXT_PUBLIC_AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_BEARER_TOKEN: process.env.AUTH_BEARER_TOKEN,
    PROJECT_ID_VERCEL: process.env.PROJECT_ID_VERCEL,
    TEAM_ID_VERCEL: process.env.TEAM_ID_VERCEL,
    VERCEL_URL: process.env.VERCEL_URL,
    PORT: process.env.PORT,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    S3_REGION: process.env.S3_REGION,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    NEXT_PUBLIC_S3_BUCKET_DOMAIN: process.env.NEXT_PUBLIC_S3_BUCKET_DOMAIN,
    NEXT_PUBLIC_DNS_DOMAIN: process.env.NEXT_PUBLIC_DNS_DOMAIN,
    GH_WEBHOOK_SECRET: process.env.GH_WEBHOOK_SECRET,
    GH_WEBHOOK_URL: process.env.GH_WEBHOOK_URL,
    GH_ACCESS_TOKEN: process.env.GH_ACCESS_TOKEN,
    GTM_ID: process.env.GTM_ID,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_CONTACT_LISTID: process.env.BREVO_CONTACT_LISTID,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    INNGEST_APP_ID: process.env.INNGEST_APP_ID,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PREMIUM_MONTHLY_PRICE_ID:
      process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    STRIPE_PREMIUM_YEARLY_PRICE_ID: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    E2E_GH_USERNAME: process.env.E2E_GH_USERNAME,
    E2E_GH_PASSWORD: process.env.E2E_GH_PASSWORD,
    TYPESENSE_ADMIN_API_KEY: process.env.TYPESENSE_ADMIN_API_KEY,
    NEXT_PUBLIC_TYPESENSE_CLIENT_API_KEY:
      process.env.NEXT_PUBLIC_TYPESENSE_CLIENT_API_KEY,
    NEXT_PUBLIC_TYPESENSE_HOST: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
    NEXT_PUBLIC_TYPESENSE_PORT: process.env.NEXT_PUBLIC_TYPESENSE_PORT,
    NEXT_PUBLIC_TYPESENSE_PROTOCOL: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
