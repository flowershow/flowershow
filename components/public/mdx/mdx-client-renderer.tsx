"use client";
import { ErrorBoundary } from "react-error-boundary";
import { hydrate, type SerializeResult } from "next-mdx-remote-client/csr";

import type { PageMetadata, PublicSite } from "@/server/api/types";
import type { Blob } from "@prisma/client";
import ErrorMessage from "@/components/public/error-message";
import { mdxComponentsFactory } from "./mdx-components-factory";

type Props = {
  mdxSource: SerializeResult<PageMetadata>;
  blob: Blob;
  site: PublicSite;
  pageNumber?: number;
};

function MDXClientRenderer({ mdxSource, blob, site, pageNumber }: Props) {
  if ("error" in mdxSource) {
    const message = mdxSource.error.message.concat(
      "\n\n🧑‍🔧 See how to debug and solve most common MDX errors in our docs:\nhttps://flowershow.app/docs/debug-mdx-errors",
    );
    return <ErrorMessage title="Error parsing MDX" message={message} />;
  }

  const components = mdxComponentsFactory({
    blob,
    site,
    pageNumber,
  });

  try {
    const { content, mod, error } = hydrate({
      ...mdxSource,
      components,
    });

    if (error) {
      const message = error.message.concat(
        "\n\n🧑‍🔧 See how to debug and solve most common MDX errors in our docs:\nhttps://flowershow.app/docs/debug-mdx-errors",
      );
      return <ErrorMessage title="Error parsing MDX" message={message} />;
    }

    return (
      <ErrorBoundary FallbackComponent={Fallback}>{content}</ErrorBoundary>
    );
  } catch (err: any) {
    return <ErrorMessage title="Error" message={err.message} />;
  }
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

export default MDXClientRenderer;
