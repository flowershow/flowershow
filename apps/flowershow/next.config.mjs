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
