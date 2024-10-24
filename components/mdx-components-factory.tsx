import { PageMetadata, isDatasetPage } from "@/server/api/types";
import { resolveLink } from "@/lib/resolve-link";
import { Site } from "@prisma/client";
import { customEncodeUrl } from "@/lib/url-encoder";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorMessage } from "@/components/error-message";

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
import { FrictionlessViewFactory } from "./frictionless-view";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

export const mdxComponentsFactory = ({
  metadata,
  siteMetadata,
}: {
  metadata: PageMetadata;
  siteMetadata: SiteWithUser;
}) => {
  const { gh_username } = siteMetadata.user || {};
  const { projectName, gh_repository, customDomain } = siteMetadata;

  let rawFilePermalinkBase: string;

  // TODO there should be a better way to handle this
  if (customDomain) {
    rawFilePermalinkBase = `/_r/-`;
    // NOTE: aliases
    // temporary solution for our aliased sites
  } else if (gh_username === "olayway") {
    if (gh_repository.startsWith("datasets/")) {
      rawFilePermalinkBase = `/core/${projectName}/_r/-`;
    } else if (projectName === "blog") {
      rawFilePermalinkBase = `/blog/_r/-`;
    } else if (projectName === "docs") {
      rawFilePermalinkBase = `/docs/_r/-/`;
    } else if (projectName === "collections") {
      rawFilePermalinkBase = `/collections/_r/-`;
    } else {
      rawFilePermalinkBase = `/@${gh_username}/${projectName}/_r/-`;
    }
  } else if (gh_username === "rufuspollock" && projectName === "notes") {
    rawFilePermalinkBase = `/notes/_r/-`;
  } else {
    rawFilePermalinkBase = `/@${gh_username}/${projectName}/_r/-`;
  }

  const resolveDataUrl = (url: string) =>
    resolveLink({
      link: url,
      filePath: metadata._path,
      prefixPath: rawFilePermalinkBase,
    });

  const components: any = {
    /* HTML elements */
    a: ({
      href,
      children,
      ...rest
    }: React.LinkHTMLAttributes<HTMLAnchorElement>) => {
      if (!href) return <a {...rest}>{children}</a>;

      const isExternal = href.startsWith("http");
      const isHeading = href.startsWith("#");

      const _href = isHeading
        ? href
        : resolveLink({
            link: isExternal ? href : customEncodeUrl(href),
            filePath: metadata._path,
            prefixPath: siteMetadata.customDomain
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
        filePath: metadata._path,
        prefixPath: rawFilePermalinkBase,
      });

      return <img {...props} src={normalizedSrc} />;
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
    Catalog: withErrorBoundary(Catalog, "Catalog"),
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

  if (isDatasetPage(metadata)) {
    // TODO is this needed at all?
    const FrictionlessView = FrictionlessViewFactory(metadata);
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
