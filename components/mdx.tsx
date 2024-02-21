"use client";
// TODO the whole layout shouldn\t be client-side rendered, only parts of it
import { MDXRemote } from "next-mdx-remote";
import { Mermaid, Pre } from "@portaljs/core";
import * as DataRichComponents from "@portaljs/components";
import "@portaljs/components/styles.css";
import layouts from "@/components/layouts";
import { FrictionlessViewFactory } from "./frictionless-view";

const tableComponent = (props) => (
  <div className="overflow-x-auto">
    <table {...props} />
  </div>
);

const linkComponent = ({ href, children, ...rest }) => {
  const processedHref = href.replace(/\.[^/.]+$/, "");
  return (
    <a href={processedHref} {...rest}>
      {children}
    </a>
  );
};

const components: any = {
  mermaid: Mermaid,
  pre: Pre,
  table: tableComponent,
  a: linkComponent,
  ...DataRichComponents,
};

export default function MDX({ source, frontMatter, dataUrlBase }) {
  if (frontMatter.datapackage) {
    components.FrictionlessView = FrictionlessViewFactory({
      views: frontMatter.datapackage.views,
      resources: frontMatter.datapackage.resources,
      dataUrlBase,
    });
  }

  const Layout = ({ children }) => {
    if (frontMatter.datapackage) {
      const Component = layouts["datapackage"];
      // TODO gh_repository and gh_branch passed as a temporary solution to support relative paths
      // in datapackage
      return (
        <Component
          {...frontMatter}
          datapackage={frontMatter.datapackage}
          dataUrlBase={dataUrlBase}
        >
          {children}
        </Component>
      );
    }

    const Component = layouts[frontMatter.layout || "story"];
    const authors = (frontMatter.authors || []).map((author) => ({
      name: author,
      avatar: "/avatarplaceholder.png",
    }));
    return (
      <Component {...frontMatter} authors={authors}>
        {children}
      </Component>
    );
  };

  return (
    <article id="mdxpage" className="mt-20 pb-20" suppressHydrationWarning>
      <Layout>
        <MDXRemote {...source} components={components} />
      </Layout>
    </article>
  );
}
