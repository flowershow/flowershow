import { MDXRemote, MDXRemoteProps } from "next-mdx-remote";
import { Pre } from "@portaljs/core";
import dynamic from "next/dynamic";
import { Vega, VegaLite } from "react-vega";

export default function MDX({
    source,
}: {
    source: MDXRemoteProps,
}) {

    const components = {
        pre: Pre,
        table: (props) => (
            <div className="overflow-x-auto">
                <table {...props} />
            </div>
        ),
        Vega,
        VegaLite,
        FlatUiTable: dynamic(() => import("./FlatUiTable").then((mod) => mod.FlatUiTable)),
        LineChart: dynamic(() => import("./LineChart").then((mod) => mod.LineChart)),
        /* Catalog: () => <div>Catalog is not available in this preview.</div>,
* PdfViewer: () => <div>PdfViewer is not available in this preview.</div>,
* Map: () => <div>Map is not available in this preview.</div>,
* OpenLayers: () => <div>OpenLayers is not available in this preview.</div>,
* Excel: () => <div>Excel is not available in this preview.</div>,
* BucketViewer: () => <div>BucketViewer is not available in this preview.</div>,
* Table: () => <div>Table is not available in this preview.</div>, */
    };

    return (
        <article
            className={`prose prose-sm mx-auto`}
            suppressHydrationWarning={true}
        >
            <MDXRemote {...source} components={components} />
        </article>
    );
}
