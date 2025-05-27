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
import { useEffect, useRef } from "react";

// use dynamic import to disable server side rendering for these components
// as they depend on the window object

const Mermaid = dynamic(
  () => import("mdx-mermaid/lib/Mermaid").then((mod) => mod.Mermaid),
  { ssr: false },
);
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

type CustomHtmlProps = {
  html: string;
};

const CustomHtml = ({ html }: CustomHtmlProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1) Render raw HTML on both server & client
  //    so your links, styles, markup all exist in the SSR output.
  // 2) Then in useEffect, find any <script> tags and replace
  //    them with fresh ones so the browser will execute them.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // find any scripts in the injected HTML
    const scripts = Array.from(el.querySelectorAll("script"));
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      // copy attributes (src, type, async, etc.)
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value),
      );
      // copy inline content
      newScript.text = oldScript.text;
      // replace the old inert <script> with an active one
      oldScript.replaceWith(newScript);
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      // server + client markup match exactly
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export {
  Catalog,
  CustomHtml,
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
  CustomHtmlProps,
  ExcelProps,
  FlatUiTableProps,
  IframeProps,
  LineChartProps,
  MapProps,
  PdfViewerProps,
  PlotlyBarChartProps,
  PlotlyLineChartProps,
};
