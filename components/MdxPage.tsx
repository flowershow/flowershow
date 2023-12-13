import { MDXRemote } from "next-mdx-remote";
import { Mermaid, Pre } from "@portaljs/core";
import { Vega, VegaLite } from "react-vega";
import dynamic from "next/dynamic";

import layouts from "../layouts";

// Custom components/renderers to pass to MDX.
// Since the MDX files aren't loaded by webpack, they have no knowledge of how
// to handle import statements. Instead, you must include components in scope
// here.
const components = {
    mermaid: Mermaid,
    pre: Pre,
    table: (props) => (
        <div className="overflow-x-auto">
            <table {...props} />
        </div>
    ),
    Vega,
    VegaLite,
    FlatUiTable: dynamic(() => import("./home/FlatUiTable").then((mod) => mod.FlatUiTable)),
    LineChart: dynamic(() => import("./home/LineChart").then((mod) => mod.LineChart)),
};

export default function MdxPage({ source, frontMatter }) {
    const Layout = ({ children }) => {
        if (frontMatter.layout) {
            const LayoutComponent = layouts[frontMatter.layout];
            return <LayoutComponent {...frontMatter}>{children}</LayoutComponent>;
        }
        return <>{children}</>;
    };

    return (
        <main id="mdxpage" className="prose mx-auto">
            <Layout>
                <MDXRemote {...source} components={components} />
            </Layout>
        </main>
    );
}
