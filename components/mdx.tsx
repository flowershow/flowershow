"use client";
// TODO the whole layout shouldn\t be client-side rendered, only parts of it
import { MDXRemote } from "next-mdx-remote";
import "@portaljs/components/styles.css";

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
    const authors = (frontMatter.authors || []).map((author) => ({
      name: author,
      avatar: "/avatarplaceholder.png", // TODO temporary, until we add back support for authors
    }));

    return (
      <Component {...frontMatter} authors={authors} dataUrlBase={dataUrlBase}>
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
