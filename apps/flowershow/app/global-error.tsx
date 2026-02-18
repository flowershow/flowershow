'use client';

import clsx from 'clsx';
import posthog from 'posthog-js';
import { useEffect } from 'react';
import {
  fontBrand,
  fontDashboardBody,
  fontDashboardHeading,
} from '@/styles/fonts-dashboard';
import '@/styles/dashboard.css';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html
      className={clsx(
        fontDashboardHeading.variable,
        fontDashboardBody.variable,
        fontBrand.variable,
      )}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <div className="max-w-4xl text-center">
            <h1 className="mb-4 text-6xl font-bold text-gray-800">500</h1>
            <p className="mb-8 text-xl text-gray-600">Internal Server Error</p>
            <p className="text-gray-500">
              An error occurred while rendering this page. Please try again
              later.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
