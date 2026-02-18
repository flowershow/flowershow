import { PostHog } from 'posthog-node';
import { env } from '@/env.mjs';

export default function PostHogClient() {
  const posthogClient = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  posthogClient.debug(process.env.NODE_ENV === 'development');
  return posthogClient;
}
