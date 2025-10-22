import { ErrorBoundary } from "react-error-boundary";

import type { Blob } from "@prisma/client";
import { resolveLinkToUrl } from "@/lib/resolve-link";
import { getSiteUrlPath } from "@/lib/get-site-url";

import { ErrorMessage } from "@/components/public/error-message";
import List from "./list";
import type { ListProps } from "./list";
import Pre from "./pre";

import {
  // Catalog,
  Excel,
  FlatUiTable,
  Iframe,
  LineChart,
  Map,
  Plotly,
  PlotlyBarChart,
  PlotlyLineChart,
  Vega,
  VegaLite,
  Mermaid,
  CustomHtml,
} from "./mdx-client-components";

import type {
  CustomHtmlProps,
  ExcelProps,
  FlatUiTableProps,
  IframeProps,
  LineChartProps,
  MapProps,
  PlotlyBarChartProps,
  PlotlyLineChartProps,
} from "./mdx-client-components";
import { PublicSite } from "@/server/api/routers/site";

export const mdxComponentsFactory = ({
  blob,
  site,
  pageNumber,
}: {
  blob: Blob;
  site: PublicSite;
  pageNumber?: number;
}) => {
  const components: any = {
    /* HTML tags */
    a: ({
      href,
      children,
      ...rest
    }: React.LinkHTMLAttributes<HTMLAnchorElement>) => {
      if (!href) return <a {...rest}>{children}</a>;

      const isExternal = href?.startsWith("http");

      return (
        <a
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          href={href}
          {...rest}
        >
          {children}
        </a>
      );
    },
    code: (props) => {
      const className = props.className?.includes("language-")
        ? props.className
        : `${props.className || ""} language-auto`;
      return <code {...props} className={className}></code>;
    },
    pre: (props) => <Pre {...props} />,
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      if (!props.src) return <img {...props} />;
      // TODO temporary quick patch to support special signs in file names
      const [sitePath, assetPath] = (props.src as string).split("/_r/-/");
      if (!sitePath || !assetPath) {
        return <img {...props} />;
      }
      const encodedAssetPath = assetPath!
        .split("/")
        .map((f) => encodeURIComponent(f))
        .join("/");
      return (
        <img
          {...props}
          src={`${sitePath}/_r/-/${encodedAssetPath}`}
          className="rounded-md"
        />
      );
    },
    // pre: (props) => <Pre {...props} className="not-prose" />,
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="overflow-x-auto">
        <table {...props} />
      </div>
    ),
    /* Custom */
    CustomHtml: withErrorBoundary((props: CustomHtmlProps) => {
      return <CustomHtml {...props} />;
    }, "CustomHtml"),
    List: withErrorBoundary((props: ListProps) => {
      return <List {...props} siteId={site.id} pageNumber={pageNumber} />;
    }, "List"),
    mermaid: Mermaid,
    // Catalog: withErrorBoundary(Catalog, "Catalog"),
    Excel: withErrorBoundary((props: ExcelProps) => {
      props.data.url = resolveLinkToUrl({
        target: props.data.url,
        originFilePath: blob.path,
        isSrcLink: true,
        prefix: getSiteUrlPath(site),
        domain: site.customDomain,
      });
      return <Excel {...props} />;
    }, "Excel"),
    FlatUiTable: withErrorBoundary((props: FlatUiTableProps) => {
      if (props.data?.url)
        props.data.url = resolveLinkToUrl({
          target: props.data.url,
          originFilePath: blob.path,
          isSrcLink: true,
          prefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });

      console.log("PROPS FLATUI", props.data.url);

      return <FlatUiTable {...props} />;
    }, "FlatUiTable"),
    Iframe: withErrorBoundary((props: IframeProps) => {
      props.data.url = resolveLinkToUrl({
        target: props.data.url,
        originFilePath: blob.path,
        isSrcLink: true,
        prefix: getSiteUrlPath(site),
        domain: site.customDomain,
      });
      return <Iframe {...props} />;
    }, "Iframe"),
    LineChart: withErrorBoundary((props: LineChartProps) => {
      if (props.data?.url) {
        props.data.url = resolveLinkToUrl({
          target: props.data.url,
          originFilePath: blob.path,
          isSrcLink: true,
          prefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      }
      return <LineChart {...props} />;
    }, "LineChart"),
    Map: withErrorBoundary((props: MapProps) => {
      const layers = props.layers.map((layer) => {
        if (layer.data.url) {
          layer.data.url = resolveLinkToUrl({
            target: layer.data.url,
            originFilePath: blob.path,
            isSrcLink: true,
            prefix: getSiteUrlPath(site),
            domain: site.customDomain,
          });
        }
        return layer;
      });
      return <Map {...props} layers={layers} />;
    }, "Map"),
    // PdfViewer: withErrorBoundary((props: PdfViewerProps) => {
    //   props.data.url = resolveLinkToUrl({
    //     target: props.data.url,
    //     originFilePath: blob.path,
    //     isSrcLink: true,
    //     prefix: getSiteUrlPath(site),
    //   });
    //   return <PdfViewer {...props} />;
    // }, "PdfViewer"),
    Plotly: withErrorBoundary((props) => {
      const data =
        typeof props.data === "string"
          ? resolveLinkToUrl({
              target: props.data,
              originFilePath: blob.path,
              isSrcLink: true,
              prefix: getSiteUrlPath(site),
              domain: site.customDomain,
            })
          : props.data;
      return <Plotly {...props} data={data} />;
    }, "Plotly"),
    PlotlyBarChart: withErrorBoundary((props: PlotlyBarChartProps) => {
      if (props.data.url) {
        props.data.url = resolveLinkToUrl({
          target: props.data.url,
          originFilePath: blob.path,
          isSrcLink: true,
          prefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      }
      return <PlotlyBarChart {...props} />;
    }, "PlotlyBarChart"),
    PlotlyLineChart: withErrorBoundary((props: PlotlyLineChartProps) => {
      if (props.data.url) {
        props.data.url = resolveLinkToUrl({
          target: props.data.url,
          originFilePath: blob.path,
          isSrcLink: true,
          prefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      }
      return <PlotlyLineChart {...props} />;
    }, "PlotlyLineChart"),
    Vega: withErrorBoundary((props) => {
      if (props.spec.data.url)
        props.spec.data.url = resolveLinkToUrl({
          target: props.spec.data.url,
          originFilePath: blob.path,
          isSrcLink: true,
          prefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      return <Vega {...props} />;
    }, "Vega"),
    VegaLite: withErrorBoundary((props) => {
      if (props.spec.data.url)
        props.spec.data.url = resolveLinkToUrl({
          target: props.spec.data.url,
          originFilePath: blob.path,
          isSrcLink: true,
          prefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      return <VegaLite {...props} />;
    }, "VegaLite"),
  };

  // if (isDatasetPage(blob.metadata as PageMetadata)) {
  //   // TODO is this needed at all?
  //   const FrictionlessView = FrictionlessViewFactory(
  //     blob.metadata as DatasetPageMetadata,
  //   );
  //   components.FrictionlessView = ({
  //     id,
  //     fullWidth,
  //   }: {
  //     id: number;
  //     fullWidth: boolean;
  //   }) => <FrictionlessView viewId={id} fullWidth={fullWidth} />;
  //   components.FrictionlessView.displayName = "FrictionlessView";
  // }

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
