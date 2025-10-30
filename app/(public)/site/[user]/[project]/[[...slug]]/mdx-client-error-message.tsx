"use client";

import { ErrorMessage } from "@/components/public/error-message";
import { ErrorBoundary } from "react-error-boundary";

export function MDXRenderingError({ children }) {
  return <ErrorBoundary FallbackComponent={Fallback}>{children}</ErrorBoundary>;
}

function Fallback() {
  const message = `
There was an error rendering this page.

This can happen if something in the MDX evaluation failed at runtime.

🧑‍🔧 Troubleshooting steps and examples:
https://flowershow.app/docs/debug-mdx-errors
  `.trim();

  return <ErrorMessage title="Error rendering MDX" message={message} />;
}
