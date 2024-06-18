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
    POSTGRES_PRISMA_URL: z
      .string()
      .url(),
    POSTGRES_URL_NON_POOLING: z
      .string()
      .url(),
    // TURSO_AUTH_TOKEN: z.string(),
    // TURSO_DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    // Add ` on ID and SECRET if you want to make sure they're not empty
    AUTH_GITHUB_SECRET: z.string(),
    AUTH_BEARER_TOKEN: z.string().optional(), // TODO temp set to optional as not set directly on Vercel
    PROJECT_ID_VERCEL: z.string().optional(), // TODO temp set to optional as not set directly on Vercel
    TEAM_ID_VERCEL: z.string().optional(), // TODO temp set to optional as not set directly on Vercel
    VERCEL_URL: z.string().optional(),
    PORT: z.string().optional(),
    REDIRECT_TO_CUSTOM_DOMAIN_IF_EXISTS: z.string().default("false"),
    R2_ACCOUNT_ID: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_KEY_ID: z.string(),
    R2_BUCKET_NAME: z.string(),
    GITHUB_WEBHOOK_SECRET: z.string(),
    GITHUB_WEBHOOK_URL: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_AUTH_GITHUB_ID: z.string(),
    NEXT_PUBLIC_ROOT_DOMAIN: z.string(),
    // Vercel system env var
    // https://vercel.com/docs/projects/environment-variables/system-environment-variables
    NEXT_PUBLIC_VERCEL_ENV: z.string().optional(),
    NEXT_PUBLIC_DNS_DOMAIN: z.string(),
    NEXT_PUBLIC_R2_BUCKET_DOMAIN: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
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
    REDIRECT_TO_CUSTOM_DOMAIN_IF_EXISTS: process.env.REDIRECT_TO_CUSTOM_DOMAIN_IF_EXISTS,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_KEY_ID: process.env.R2_SECRET_KEY_ID,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    NEXT_PUBLIC_R2_BUCKET_DOMAIN: process.env.NEXT_PUBLIC_R2_BUCKET_DOMAIN,
    NEXT_PUBLIC_DNS_DOMAIN: process.env.NEXT_PUBLIC_DNS_DOMAIN,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    GITHUB_WEBHOOK_URL: process.env.GITHUB_WEBHOOK_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
