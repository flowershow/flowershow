import { MDXRemote } from "next-mdx-remote";
import dynamic from "next/dynamic";
import { Mermaid } from "@flowershow/core";

import { Vega, VegaLite } from "react-vega";
import layouts from "@/layouts";

// Custom components/renderers to pass to MDX.
// Since the MDX files aren't loaded by webpack, they have no knowledge of how
// to handle import statements. Instead, you must include components in scope
// here.
const components = {
  Table: dynamic(() => import("./Table")),
  mermaid: Mermaid,
  // Excel: dynamic(() => import('../components/Excel')),
  // TODO: try and make these dynamic ...
  Vega: Vega,
  VegaLite: VegaLite,
  LineChart: dynamic(() => import("./LineChart")),
};

export default function DRD({ source, frontMatter }) {
  const Layout = ({ children }) => {
    if (frontMatter.layout) {
      let LayoutComponent = layouts[frontMatter.layout];
      return <LayoutComponent {...frontMatter}>{children}</LayoutComponent>;
    }
    return <>{children}</>;
  };

  return (
    <div className="prose mx-auto">
      <header>
        <div className="mb-6">
          {/* Default layout */}
          {!frontMatter.layout && (
            <>
              <h1>{frontMatter.title}</h1>
              {frontMatter.author && (
                <div className="-mt-6">
                  <p className="opacity-60 pl-1">{frontMatter.author}</p>
                </div>
              )}
              {frontMatter.description && (
                <p className="description">{frontMatter.description}</p>
              )}
            </>
          )}
        </div>
      </header>
      <main>
        <Layout>
          <MDXRemote {...source} components={components} />
        </Layout>
      </main>
    </div>
  );
}
