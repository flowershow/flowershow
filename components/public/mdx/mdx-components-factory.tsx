import { ErrorBoundary } from "react-error-boundary";

import type { Blob } from "@prisma/client";
import { resolvePathToUrl } from "@/lib/resolve-link";
import { getSiteUrlPath } from "@/lib/get-site-url";

import ErrorMessage from "@/components/public/error-message";
import List from "./list";
import Pre from "./pre";
import { PublicSite } from "@/server/api/routers/site";
import { PdfViewer } from "./pdf-viewer";

import {
  CustomHtml,
  FlatUiTable,
  LineChart,
  Mermaid,
  Plotly,
  PlotlyBarChart,
  PlotlyLineChart,
  Vega,
} from "./mdx-client-components";

import type { CustomHtmlProps } from "./custom-html";
import type { FlatUiTableProps } from "./flatui-table";
import type { LineChartProps } from "./line-chart";
import type { ListProps } from "./list";
import type { MDXComponents } from "next-mdx-remote-client/rsc";
import type { PlotlyBarChartProps } from "./plotly-bar-chart";
import type { PlotlyLineChartProps } from "./plotly-line-chart";

export const mdxComponentsFactory = ({
  blob,
  site,
  pageNumber,
}: {
  blob: Blob;
  site: PublicSite;
  pageNumber?: number;
}) => {
  const components: MDXComponents = {
    pre: (props) => <Pre {...props} />,
    iframe: (props) => {
      const src = props.src ?? "";

      const isPdf =
        typeof src === "string" && src.split("#")[0]?.endsWith(".pdf");

      if (isPdf) {
        return <PdfViewer src={src} />;
      }

      return <iframe {...props} />;
    },
    CustomHtml: withErrorBoundary((props: CustomHtmlProps) => {
      return <CustomHtml {...props} />;
    }, "CustomHtml"),
    List: withErrorBoundary((props: ListProps) => {
      return <List {...props} siteId={site.id} pageNumber={pageNumber} />;
    }, "List"),
    mermaid: Mermaid as any,
    FlatUiTable: withErrorBoundary((props: FlatUiTableProps) => {
      if (props.data?.url)
        props.data.url = resolvePathToUrl({
          target: props.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });

      return <FlatUiTable {...props} />;
    }, "FlatUiTable"),
    LineChart: withErrorBoundary((props: LineChartProps) => {
      if (props.data?.url) {
        props.data.url = resolvePathToUrl({
          target: props.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      }
      return <LineChart {...props} />;
    }, "LineChart"),
    PlotlyBarChart: withErrorBoundary((props: PlotlyBarChartProps) => {
      if (props.data.url) {
        props.data.url = resolvePathToUrl({
          target: props.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      }
      return <PlotlyBarChart {...props} />;
    }, "PlotlyBarChart"),
    PlotlyLineChart: withErrorBoundary((props: PlotlyLineChartProps) => {
      if (props.data.url) {
        props.data.url = resolvePathToUrl({
          target: props.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      }
      return <PlotlyLineChart {...props} />;
    }, "PlotlyLineChart"),
    // Excel: withErrorBoundary((props: ExcelProps) => {
    //   props.data.url = resolvePathToUrl({
    //     target: props.data.url,
    //     originFilePath: blob.path,
    //     isSrcLink: true,
    //     prefix: getSiteUrlPath(site),
    //     domain: site.customDomain,
    //   });
    //   return <Excel {...props} />;
    // }, "Excel"),
    // Map: withErrorBoundary((props: MapProps) => {
    //   const layers = props.layers.map((layer) => {
    //     if (layer.data.url) {
    //       layer.data.url = resolvePathToUrl({
    //         target: layer.data.url,
    //         originFilePath: blob.path,
    //         isSrcLink: true,
    //         prefix: getSiteUrlPath(site),
    //         domain: site.customDomain,
    //       });
    //     }
    //     return layer;
    //   });
    //   return <Map {...props} layers={layers} />;
    // }, "Map"),
    Plotly: withErrorBoundary((props) => {
      const data =
        typeof props.data === "string"
          ? resolvePathToUrl({
              target: props.data,
              originFilePath: blob.path,
              sitePrefix: getSiteUrlPath(site),
              domain: site.customDomain,
            })
          : props.data;
      return <Plotly {...props} data={data} />;
    }, "Plotly"),
    Vega: withErrorBoundary((props) => {
      if (props.spec.data.url)
        props.spec.data.url = resolvePathToUrl({
          target: props.spec.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      return <Vega {...props} />;
    }, "Vega"),
    // TODO this is not needed
    VegaLite: withErrorBoundary((props) => {
      if (props.spec.data.url)
        props.spec.data.url = resolvePathToUrl({
          target: props.spec.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      return <Vega {...props} />;
    }, "VegaLite"),
  };

  return components;
};

const withErrorBoundary = (
  Component: React.ComponentType<any>,
  componentName: string,
) => {
  const WrappedComponent = (props: any) => (
    <ErrorBoundary
      fallback={
        <ErrorMessage
          title={`Error in ${componentName} component`}
          message="Make sure you're using the component correctly."
        />
      }
    >
      <Component {...props} />
    </ErrorBoundary>
  );
  WrappedComponent.displayName = "ErrorBoundary";
  return WrappedComponent;
};
