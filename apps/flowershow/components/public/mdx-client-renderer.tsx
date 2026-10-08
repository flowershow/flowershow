'use client';
import type { Blob } from '@prisma/client';
import { hydrate, type SerializeResult } from 'next-mdx-remote-client/csr';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorMessage from '@/components/public/error-message';
import { PageScripts } from '@/components/public/page-scripts';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import type { SiteLookupResult, PageMetadata } from '@/server/api/types';
import { mdxComponentsFactory } from './mdx/mdx-components-factory';

type Props = {
  mdxSource: SerializeResult<PageMetadata>;
  blob: Blob;
  site: SiteLookupResult;
  imageDimensions?: ImageDimensionsMap;
  /** Resolved page scripts, loaded after the MDX content is committed. */
  scripts?: string[];
};

function MDXClientRenderer({
  mdxSource,
  blob,
  site,
  imageDimensions,
  scripts,
}: Props) {
  if ('error' in mdxSource) {
    return (
      <ErrorMessage
        title="Error parsing MDX"
        message={mdxSource.error.message}
        link={{
          href: 'https://flowershow.app/docs/debug-mdx-errors',
          label: 'See how to debug and solve most common MDX errors',
        }}
      />
    );
  }

  const components = mdxComponentsFactory({
    blob,
    site,
    imageDimensions,
  });

  try {
    const { content, mod, error } = hydrate({
      ...mdxSource,
      components,
    });

    if (error) {
      return (
        <ErrorMessage
          title="Error parsing MDX"
          message={error.message}
          link={{
            href: 'https://flowershow.app/docs/debug-mdx-errors',
            label: 'See how to debug and solve most common MDX errors',
          }}
        />
      );
    }

    // PageScripts is a later sibling of the content, so its effect runs once
    // the MDX DOM exists. It sits inside the boundary: no scripts if MDX fails.
    return (
      <ErrorBoundary FallbackComponent={Fallback}>
        {content}
        {scripts?.length ? (
          <PageScripts key={blob.path} srcs={scripts} />
        ) : null}
      </ErrorBoundary>
    );
  } catch (err: any) {
    return <ErrorMessage title="Error" message={err.message} />;
  }
}

function Fallback() {
  return (
    <ErrorMessage
      title="Error rendering MDX"
      message="There was an error rendering this page. This can happen if something in the MDX evaluation failed at runtime."
      link={{
        href: 'https://flowershow.app/docs/debug-mdx-errors',
        label: 'See troubleshooting steps and examples',
      }}
    />
  );
}

export default MDXClientRenderer;
