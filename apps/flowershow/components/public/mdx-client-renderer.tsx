'use client';
import type { Blob } from '@prisma/client';
import { hydrate, type SerializeResult } from 'next-mdx-remote-client/csr';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorMessage from '@/components/public/error-message';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import type { PageMetadata, PublicSite } from '@/server/api/types';
import { mdxComponentsFactory } from './mdx/mdx-components-factory';

type Props = {
  mdxSource: SerializeResult<PageMetadata>;
  blob: Blob;
  site: PublicSite;
  imageDimensions?: ImageDimensionsMap;
};

function MDXClientRenderer({ mdxSource, blob, site, imageDimensions }: Props) {
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

    return (
      <ErrorBoundary FallbackComponent={Fallback}>{content}</ErrorBoundary>
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
