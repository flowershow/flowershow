"use client";
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#using-third-party-packages-and-providers
import dynamic from "next/dynamic";

import {
  ExcelProps,
  FlatUiTableProps,
  IframeProps,
  LineChartProps,
  MapProps,
  PdfViewerProps,
  PlotlyBarChartProps,
  PlotlyLineChartProps,
} from "@portaljs/components";

import { Pre } from "@portaljs/core";
import { Mermaid } from "mdx-mermaid/lib/Mermaid";

// use dynamic import to disable server side rendering for these components
// as they depend on the window object
const Catalog = dynamic(
  () => import("@portaljs/components").then((mod) => mod.Catalog),
  { ssr: false },
);
const Excel = dynamic(
  () => import("@portaljs/components").then((mod) => mod.Excel),
  { ssr: false },
);
const FlatUiTable = dynamic(
  () => import("@portaljs/components").then((mod) => mod.FlatUiTable),
  { ssr: false },
);
const Iframe = dynamic(
  () => import("@portaljs/components").then((mod) => mod.Iframe),
  { ssr: false },
);
const LineChart = dynamic(
  () => import("@portaljs/components").then((mod) => mod.LineChart),
  { ssr: false },
);
const Map = dynamic(
  () => import("@portaljs/components").then((mod) => mod.Map),
  { ssr: false },
);
const PdfViewer = dynamic(
  () => import("@portaljs/components").then((mod) => mod.PdfViewer),
  { ssr: false },
);
const Plotly = dynamic(
  () => import("@portaljs/components").then((mod) => mod.Plotly),
  { ssr: false },
);
const PlotlyBarChart = dynamic(
  () => import("@portaljs/components").then((mod) => mod.PlotlyBarChart),
  { ssr: false },
);
const PlotlyLineChart = dynamic(
  () => import("@portaljs/components").then((mod) => mod.PlotlyLineChart),
  { ssr: false },
);
const Vega = dynamic(
  () => import("@portaljs/components").then((mod) => mod.Vega),
  { ssr: false },
);
const VegaLite = dynamic(
  () => import("@portaljs/components").then((mod) => mod.VegaLite),
  { ssr: false },
);

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
