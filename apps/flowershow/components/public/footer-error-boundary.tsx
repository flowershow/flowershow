'use client';

import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Contains render errors in the custom `_footer.md` footer. The footer renders
 * in the site layout, where an uncaught error skips the segment's error.tsx
 * and takes down every page via global-error, so a broken footer falls back
 * to the default footer instead.
 */
export function FooterErrorBoundary({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error) => {
        console.error('Custom footer failed to render:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
