'use client';

import * as Sentry from '@sentry/nextjs';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function SentryUserBinder() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      Sentry.setUser({
        id: (session.user as any).id ?? session.user.email ?? undefined,
        email: session.user.email ?? undefined,
        username: session.user.name ?? undefined,
      });
    } else if (status === 'unauthenticated') {
      // Clear user so future anon events aren’t attributed
      Sentry.setUser(null);
    }
  }, [status, session]);

  return null;
}
