"use client";

import { ErrorMessage } from "@/components/public/error-message";
import { ErrorBoundary } from "react-error-boundary";

export function MDXRenderingError({ children }) {
  return <ErrorBoundary FallbackComponent={Fallback}>{children}</ErrorBoundary>;
}

function Fallback({ error, resetErrorBoundary }) {
  const message = error.message.concat(
    "\n\n🧑‍🔧 See how to debug and solve most common MDX errors in our docs:\nhttps://flowershow.app/docs/debug-mdx-errors",
  );

  return <ErrorMessage title="Error rendering MDX" message={message} />;
}
