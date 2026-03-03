'use client';

import { usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';

export function SessionRecording() {
  const posthog = usePostHog();

  useEffect(() => {
    posthog.startSessionRecording();
    return () => posthog.stopSessionRecording();
  }, [posthog]);

  return null;
}
