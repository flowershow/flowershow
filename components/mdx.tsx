"use client";
// TODO the whole layout shouldn\t be client-side rendered, only parts of it
import { MDXRemote } from "next-mdx-remote";
import "@portaljs/components/styles.css";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorMessage } from "@/components/error-message";

import layouts from "@/components/layouts";
import { mdxComponentsFactory } from "./mdx-components-factory";

// TODO resolve links in source ?
export default function MDX({ source, frontMatter, dataUrlBase }) {
  const components = mdxComponentsFactory({ frontMatter, dataUrlBase });
  const layout = frontMatter.datapackage
    ? "datapackage"
    : frontMatter.layout || "story";

  const Component = layouts[layout];

  const Layout = ({ children }) => {
    return (
      <ErrorBoundary FallbackComponent={LayoutFallbackComponent}>
        <Component {...frontMatter} dataUrlBase={dataUrlBase}>
          {children}
        </Component>
      </ErrorBoundary>
    );
  };

  return (
    <article id="mdxpage" className="mt-20 pb-20" suppressHydrationWarning>
      <Layout>
        <ErrorBoundary FallbackComponent={MDXFallbackComponent}>
          <MDXRemote {...source} components={components} />
        </ErrorBoundary>
      </Layout>
    </article>
  );
}

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
