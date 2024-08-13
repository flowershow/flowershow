"use client";
// Note that the above line is required to make the import of the components work
// as they themselves do not have the "use client" pragma
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#using-third-party-packages-and-providers

// TODO update @portaljs/components to use the pragma
import {
  Catalog,
  Excel,
  ExcelProps,
  FlatUiTable,
  FlatUiTableProps,
  Iframe,
  IframeProps,
  LineChart,
  LineChartProps,
  Map,
  MapProps,
  PdfViewer,
  PdfViewerProps,
  Plotly,
  PlotlyBarChart,
  PlotlyBarChartProps,
  PlotlyLineChart,
  PlotlyLineChartProps,
  Vega,
  VegaLite,
} from "@portaljs/components";

// TODO update @portaljs/core to use the pragma
import { Pre } from "@portaljs/core";

import { Mermaid } from "mdx-mermaid/lib/Mermaid";

export {
  Catalog,
  Excel,
  FlatUiTable,
  Iframe,
  LineChart,
  Map,
  PdfViewer,
  Plotly,
  PlotlyBarChart,
  PlotlyLineChart,
  Vega,
  VegaLite,
  Pre,
  Mermaid,
};

export type {
  ExcelProps,
  FlatUiTableProps,
  IframeProps,
  LineChartProps,
  MapProps,
  PdfViewerProps,
  PlotlyBarChartProps,
  PlotlyLineChartProps,
};
