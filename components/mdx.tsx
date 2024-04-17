"use client";
// TODO the whole layout shouldn\t be client-side rendered, only parts of it
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorMessage } from "@/components/error-message";
import layouts from "@/components/layouts";
import { mdxComponentsFactory } from "./mdx-components-factory";
import { PageMetadata, isDatasetPage } from "@/server/api/types";

interface MDXProps {
  source: MDXRemoteSerializeResult;
  metadata: PageMetadata;
}

const MDX: React.FC<MDXProps> = ({ source, metadata }) => {
  const components = mdxComponentsFactory(metadata);
  const layout = isDatasetPage(metadata) ? "datapackage" : "story";

  const Component = layouts[layout] as any; // TODO fix this

  const Layout = ({ children }) => {
    return (
      <ErrorBoundary FallbackComponent={LayoutFallbackComponent}>
        <Component metadata={metadata}>{children}</Component>
      </ErrorBoundary>
    );
  };

  return (
    <article id="mdxpage" suppressHydrationWarning>
      <Layout>
        <ErrorBoundary FallbackComponent={MDXFallbackComponent}>
          <MDXRemote {...source} components={components} />
        </ErrorBoundary>
      </Layout>
    </article>
  );
};

const MDXFallbackComponent = ({ error }: { error: Error }) => {
  return (
    <ErrorMessage
      title="MDX rendering error:"
      message={error.message}
      stack={error.stack}
    />
  );
};

const LayoutFallbackComponent = ({ error }: { error: Error }) => {
  return (
    <ErrorMessage title="Layout rendering error:" message={error.message} />
  );
};

export default MDX;
