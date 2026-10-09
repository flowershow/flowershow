'use client';

import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Contains render errors in custom site chrome (e.g. the `_footer.html`
 * footer). Site chrome renders in the site layout, where an uncaught error
 * skips the segment's error.tsx and takes down every page via global-error,
 * so broken custom chrome falls back to the default instead.
 */
export function ChromeErrorBoundary({
  fallback,
  label,
  children,
}: {
  fallback: ReactNode;
  /** Human-readable name for the error log ("footer"). */
  label: string;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error) => {
        console.error(`Custom ${label} failed to render:`, error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
