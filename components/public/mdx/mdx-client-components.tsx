'use client';
import dynamic from 'next/dynamic';
import { CustomHtml } from './custom-html';

const Mermaid = dynamic(
  () => import('mdx-mermaid/lib/Mermaid').then((mod) => mod.Mermaid),
  { ssr: false },
);
const FlatUiTable = dynamic(
  () => import('./flatui-table').then((mod) => mod.FlatUiTable),
  { ssr: false },
);
const LineChart = dynamic(
  () => import('./line-chart').then((mod) => mod.LineChart),
  { ssr: false },
);
const PlotlyBarChart = dynamic(
  () => import('./plotly-bar-chart').then((mod) => mod.PlotlyBarChart),
  { ssr: false },
);
const PlotlyLineChart = dynamic(
  () => import('./plotly-line-chart').then((mod) => mod.PlotlyLineChart),
  { ssr: false },
);
const ObsidianBasesViews = dynamic(
  () => import('./obsidian-bases-views').then((mod) => mod.ObsidianBasesViews),
  { ssr: false },
);
// const Map = dynamic(() => import("./map").then((mod) => mod.Map), {
//   ssr: false,
// });
const Plotly = dynamic(() => import('./plotly').then((mod) => mod.Plotly), {
  ssr: false,
});
const Vega = dynamic(() => import('./vega').then((mod) => mod.Vega), {
  ssr: false,
});
// const Excel = dynamic(
//   () => import("./excel").then((mod) => mod.Excel),
//   { ssr: false },
// );

export {
  Mermaid,
  FlatUiTable,
  LineChart,
  ObsidianBasesViews,
  Plotly,
  PlotlyBarChart,
  PlotlyLineChart,
  Vega,
  CustomHtml,
  // Map,
  // Excel,
};
