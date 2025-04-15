import { ErrorBoundary } from "react-error-boundary";
import {
  DatasetPageMetadata,
  PageMetadata,
  isDatasetPage,
} from "@/server/api/types";
import { resolveLink } from "@/lib/resolve-link";
import { customEncodeUrl } from "@/lib/url-encoder";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { ErrorMessage } from "@/components/error-message";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import { FrictionlessViewFactory } from "./frictionless-view";
import { default as List } from "./list";
import type { ListProps } from "./list";
import {
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
} from "./client-components-wrapper";

import type { SiteWithUser } from "@/types";
import type {
  ExcelProps,
  FlatUiTableProps,
  IframeProps,
  LineChartProps,
  MapProps,
  PdfViewerProps,
  PlotlyBarChartProps,
  PlotlyLineChartProps,
} from "./client-components-wrapper";
import { Blob } from "@prisma/client";

export const mdxComponentsFactory = ({
  blob,
  site,
}: {
  blob: Blob;
  site: SiteWithUser;
}) => {
  const { projectName, customDomain, user: siteUser } = site;

  const gh_username = siteUser!.gh_username!;

  const rawFilePermalinkBase = customDomain
    ? `/_r/-`
    : resolveSiteAlias(`/@${gh_username}/${projectName}`, "to") + `/_r/-`;

  const resolveDataUrl = (url: string) =>
    resolveLink({
      link: url,
      filePath: blob.path,
      prefixPath: rawFilePermalinkBase,
    });

  const dataVisComponents = {
    Catalog: withErrorBoundary(Catalog, "Catalog"),
    List: withErrorBoundary((props: ListProps) => {
      return <List {...props} siteId={site.id} />;
    }, "List"),
    Excel: withErrorBoundary((props: ExcelProps) => {
      props.data.url = resolveDataUrl(props.data.url);
      return <Excel {...props} />;
    }, "Excel"),
    Iframe: withErrorBoundary((props: IframeProps) => {
      props.data.url = resolveDataUrl(props.data.url);
      return <Iframe {...props} />;
    }, "Iframe"),
    FlatUiTable: withErrorBoundary((props: FlatUiTableProps) => {
      if (props.data?.url) props.data.url = resolveDataUrl(props.data.url);
      return <FlatUiTable {...props} />;
    }, "FlatUiTable"),
    LineChart: withErrorBoundary((props: LineChartProps) => {
      if (props.data?.url) props.data.url = resolveDataUrl(props.data.url);
      return <LineChart {...props} />;
    }, "LineChart"),
    Map: withErrorBoundary((props: MapProps) => {
      const layers = props.layers.map((layer) => {
        if (layer.data.url) layer.data.url = resolveDataUrl(layer.data.url);
        return layer;
      });
      return <Map {...props} layers={layers} />;
    }, "Map"),
    PdfViewer: withErrorBoundary((props: PdfViewerProps) => {
      props.data.url = resolveDataUrl(props.data.url);
      return <PdfViewer {...props} />;
    }, "PdfViewer"),
    Plotly: withErrorBoundary((props) => {
      const data =
        typeof props.data === "string"
          ? resolveDataUrl(props.data)
          : props.data;
      return <Plotly {...props} data={data} />;
    }, "Plotly"),
    PlotlyBarChart: withErrorBoundary((props: PlotlyBarChartProps) => {
      if (props.data.url) props.data.url = resolveDataUrl(props.data.url);
      return <PlotlyBarChart {...props} />;
    }, "PlotlyBarChart"),
    PlotlyLineChart: withErrorBoundary((props: PlotlyLineChartProps) => {
      if (props.data.url) props.data.url = resolveDataUrl(props.data.url);
      return <PlotlyLineChart {...props} />;
    }, "PlotlyLineChart"),
    Vega: withErrorBoundary((props) => {
      if (props.spec.data.url)
        props.spec.data.url = resolveDataUrl(props.spec.data.url);
      return <Vega {...props} />;
    }, "Vega"),
    VegaLite: withErrorBoundary((props) => {
      if (props.spec.data.url)
        props.spec.data.url = resolveDataUrl(props.spec.data.url);
      return <VegaLite {...props} />;
    }, "VegaLite"),
  };

  const components: any = {
    /* HTML elements */
    a: ({
      href,
      children,
      ...rest
    }: React.LinkHTMLAttributes<HTMLAnchorElement>) => {
      if (!href) return <a {...rest}>{children}</a>;

      if (href.startsWith("mailto:")) {
        return (
          <a className="break-words" href={href} {...rest}>
            {children}
          </a>
        );
      }

      const isExternal = href.startsWith("http");
      const isHeading = href.startsWith("#");

      const _href = isHeading
        ? href
        : resolveLink({
            link: isExternal ? href : customEncodeUrl(href),
            filePath: blob.path,
            prefixPath: site.customDomain
              ? ""
              : `/@${gh_username}/${projectName}`,
          });

      return (
        <a
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          href={_href}
          {...rest}
        >
          {children}
        </a>
      );
    },
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      if (!props.src) return <img {...props} />;

      const normalizedSrc = resolveLink({
        link: props.src,
        filePath: blob.path,
        prefixPath: rawFilePermalinkBase,
      });

      return <img {...props} className="rounded-md" src={normalizedSrc} />;
    },
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="overflow-x-auto">
        <table {...props} />
      </div>
    ),
    /* Custom components */
    pre: Pre,
    mermaid: Mermaid,
    code: (props) => {
      const className = props.className?.includes("language-")
        ? props.className
        : `${props.className || ""} language-auto`;
      return <code {...props} className={className}></code>;
    },
    ...(isFeatureEnabled(Feature.DataVisComponents, site)
      ? dataVisComponents
      : {}),
  };

  if (isDatasetPage(blob.metadata as PageMetadata)) {
    // TODO is this needed at all?
    const FrictionlessView = FrictionlessViewFactory(
      blob.metadata as DatasetPageMetadata,
    );
    components.FrictionlessView = ({
      id,
      fullWidth,
    }: {
      id: number;
      fullWidth: boolean;
    }) => <FrictionlessView viewId={id} fullWidth={fullWidth} />;
    components.FrictionlessView.displayName = "FrictionlessView";
  }

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
