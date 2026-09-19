// @ts-check
import { env } from './env.mjs';

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  experimental: {
    globalNotFound: true,
    serverActions: {
      allowedOrigins: [
        'cloud.localhost:3000',
        env.NEXT_PUBLIC_ROOT_DOMAIN,
        env.NEXT_PUBLIC_CLOUD_DOMAIN,
      ],
    },
  },
  images: {
    remotePatterns: [{ hostname: '*' }],
    // Non-production deployments (staging + PR previews) sit behind Vercel
    // Deployment Protection. The image optimizer runs server-side and its
    // outbound fetch to a protected site host carries no SSO cookie, so it gets
    // bounced to the Vercel login page and every optimized image breaks.
    // Skipping optimization makes the browser load images directly, where the
    // logged-in user's SSO cookie lets the request through.
    unoptimized: env.NEXT_PUBLIC_VERCEL_ENV !== 'production',
  },
  skipTrailingSlashRedirect: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error'],
          }
        : false,
  },
};

export default nextConfig;
