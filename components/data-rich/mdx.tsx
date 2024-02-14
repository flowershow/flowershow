import { useMemo } from "react";
import { getMDXComponent } from "mdx-bundler/client";
import {
  LineChart,
  FlatUiTable,
  Vega,
  VegaLite,
  Catalog,
} from "@portaljs/components";
import { Pre } from "@portaljs/core";

const components = {
  pre: Pre,
  Vega,
  VegaLite,
  FlatUiTable,
  LineChart,
  Catalog,
  PdfViewer: () => <div>PdfViewer is not available in this preview.</div>,
  Map: () => <div>Map is not available in this preview.</div>,
  OpenLayers: () => <div>OpenLayers is not available in this preview.</div>,
  Excel: () => <div>Excel is not available in this preview.</div>,
  BucketViewer: () => <div>BucketViewer is not available in this preview.</div>,
  /* table: (props) => (
   *     <div className="overflow-x-auto">
   *         <table {...props} />
   *     </div>
   * ), */
};

export default function MDX({ source }: { source }) {
  const MDX = useMemo(() => getMDXComponent(source), [source]);

  return (
    <article
      className={`prose prose-sm mx-auto`}
      suppressHydrationWarning={true}
    >
      <MDX components={components} />
    </article>
  );
}
