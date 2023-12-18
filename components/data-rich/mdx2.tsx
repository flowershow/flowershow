import dynamic from "next/dynamic";
import { useMemo } from "react";
import { getMDXComponent } from 'mdx-bundler/client'
import { Vega, VegaLite } from "react-vega";
import { Pre } from "@portaljs/core";

const components = {
    pre: Pre,
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
    table: (props) => (
        <div className="overflow-x-auto">
            <table {...props} />
        </div>
    ),
};


export default function MDX({
    source,
}: {
    source,
}) {

    const MDX = useMemo(() => getMDXComponent(source), [source])

    return (
        <article
            className={`prose prose-sm mx-auto`}
            suppressHydrationWarning={true}
        >
            <MDX components={components} />
        </article>
    );
}
