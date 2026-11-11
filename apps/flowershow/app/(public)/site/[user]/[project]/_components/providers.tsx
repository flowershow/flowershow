'use client';
import { SessionProvider } from 'next-auth/react';
import type { PostHogMode } from '@/lib/posthog-scope';
import { PostHogProvider } from '@/providers/posthog-provider';

export default function RootProviders({
  children,
  posthog,
}: {
  children: React.ReactNode;
  posthog: PostHogMode;
}) {
  // Published user sites don't load PostHog; temporary sites run it in
  // memory-only mode (the banner sends events) with no session or cookies.
  if (posthog === 'off') return <>{children}</>;
  if (posthog === 'memory') {
    return (
      <PostHogProvider persistence="memory" identify={false}>
        {children}
      </PostHogProvider>
    );
  }
  return (
    <SessionProvider>
      <PostHogProvider>{children}</PostHogProvider>
    </SessionProvider>
  );
}
