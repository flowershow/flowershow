import dynamic from "next/dynamic";
import { Mermaid as mermaid, Pre as pre } from "@portaljs/core";
import type {
  ExcelProps,
  FlatUiTableProps,
  LineChartProps,
  PdfViewerProps,
  PlotlyBarChartProps,
  PlotlyLineChartProps,
} from "@portaljs/components";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorMessage } from "@/components/error-message";
import { FrictionlessViewFactory } from "./frictionless-view";
import { PageMetadata, isDatasetPage } from "@/server/api/types";

const BucketViewer = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.BucketViewer,
  })),
);
const Catalog = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.Catalog,
  })),
);
const Excel = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.Excel,
  })),
);
const FlatUiTable = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.FlatUiTable,
  })),
);
const LineChart = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.LineChart,
  })),
);
const Map = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.Map,
  })),
);
const PdfViewer = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.PdfViewer,
  })),
);
const Plotly = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.Plotly,
  })),
);
const PlotlyBarChart = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.PlotlyBarChart,
  })),
);
const PlotlyLineChart = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.PlotlyLineChart,
  })),
);
const Vega = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.Vega,
  })),
);
const VegaLite = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.VegaLite,
  })),
);

export const mdxComponentsFactory = (metadata: PageMetadata) => {
  const components: any = {
    /* HTML elements */
    a: ({ href, children, ...rest }) => {
      let normalizedHref = href;
      const isExternal = href.startsWith("http");
      const isHeading = /^#/.test(href);
      if (!isExternal && !isHeading) {
        normalizedHref = normalizeHref(href, metadata._urlBase, metadata._path);
      }

      return (
        <a
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          href={normalizedHref}
          {...rest}
        >
          {children}
        </a>
      );
    },
    img: (props) => {
      return (
        <img
          {...props}
          src={resolveRelativeUrl(props.src, metadata._rawUrlBase)}
          alt="image"
        />
      );
    },
    table: (props) => (
      <div className="overflow-x-auto">
        <table {...props} />
      </div>
    ),
    /* Custom components */
    pre,
    code: (props) => {
      let className = props.className;
      if (!props.className || !props.className.includes("language-")) {
        // Set default className to "language-auto" if not found
        className = props.className
          ? `${props.className} language-auto`
          : "language-auto";
      }

      return <code {...props} className={className}></code>;
    },
    mermaid,
    BucketViewer: (props) => {
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`BucketViewer` component error:",
          })}
        >
          <BucketViewer {...props} />
        </ErrorBoundary>
      );
    },
    Catalog: (props) => {
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`Catalog` component error:",
          })}
        >
          <Catalog {...props} />
        </ErrorBoundary>
      );
    },
    Map: (props) => {
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`Map` component error:",
          })}
        >
          <Map {...props} />
        </ErrorBoundary>
      );
    },
    Excel: (props: ExcelProps) => {
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`Excel` component error:",
          })}
        >
          <Excel
            {...props}
            url={resolveRelativeUrl(props.url, metadata._rawUrlBase)}
          />
        </ErrorBoundary>
      );
    },
    FlatUiTable: (props: FlatUiTableProps) => {
      let url = props.url;
      if (url) {
        url = resolveRelativeUrl(url, metadata._rawUrlBase);
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`FlatUiTable` component error:",
          })}
        >
          <FlatUiTable {...props} url={url} />
        </ErrorBoundary>
      );
    },
    LineChart: (props: LineChartProps) => {
      let data = props.data;
      if (typeof data === "string") {
        data = resolveRelativeUrl(data, metadata._rawUrlBase);
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`LineChart` component error:",
          })}
        >
          <LineChart {...props} data={data} />
        </ErrorBoundary>
      );
    },
    PdfViewer: (props: PdfViewerProps) => {
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`PdfViewer` component error:",
          })}
        >
          <PdfViewer
            {...props}
            url={resolveRelativeUrl(props.url, metadata._rawUrlBase)}
          />
        </ErrorBoundary>
      );
    },
    Plotly: (props: any) => {
      let data = props.data;
      if (typeof data === "string") {
        data = resolveRelativeUrl(data, metadata._rawUrlBase);
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`Plotly` component error:",
          })}
        >
          <Plotly {...props} data={data} />
        </ErrorBoundary>
      );
    },
    PlotlyBarChart: (props: PlotlyBarChartProps) => {
      let url = props.url;
      if (url) {
        url = resolveRelativeUrl(url, metadata._rawUrlBase);
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`PlotlyBarChart` component error:",
          })}
        >
          <PlotlyBarChart {...props} url={url} />
        </ErrorBoundary>
      );
    },
    PlotlyLineChart: (props: PlotlyLineChartProps) => {
      let url = props.url;
      if (url) {
        url = resolveRelativeUrl(url, metadata._rawUrlBase);
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`PlotlyLineChart` component error:",
          })}
        >
          <PlotlyLineChart {...props} url={url} />
        </ErrorBoundary>
      );
    },
    Vega: (props) => {
      const spec = props.spec;
      if (spec.data.URL) {
        spec.data.URL = resolveRelativeUrl(spec.data.URL, metadata._rawUrlBase);
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`Vega` component error:",
          })}
        >
          <Vega {...props} spec={spec} />
        </ErrorBoundary>
      );
    },
    VegaLite: (props) => {
      const spec = props.spec;
      if (spec.data.URL) {
        spec.data.URL = resolveRelativeUrl(spec.data.URL, metadata._rawUrlBase);
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`VegaLite` component error:",
          })}
        >
          <VegaLite {...props} spec={spec} />
        </ErrorBoundary>
      );
    },
  };

  if (isDatasetPage(metadata)) {
    const FrictionlessView = FrictionlessViewFactory(metadata);
    components.FrictionlessView = ({
      id,
      fullWidth,
    }: {
      id: number;
      fullWidth: boolean;
    }) => {
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`FrictionlessView` component error:",
          })}
        >
          <FrictionlessView viewId={id} fullWidth={fullWidth} />
        </ErrorBoundary>
      );
    };
    components.FrictionlessView.displayName = "FrictionlessView";
  }
  return components;
};

const resolveRelativeUrl = (url: string, urlPrefix: string) => {
  return url.startsWith("http")
    ? url
    : `${urlPrefix}/${url.replace(/^\/+/g, "")}`;
};

const FallbackComponentFactory = ({ title }: { title: string }) => {
  const FallbackComponent = ({ error }: { error: Error }) => {
    return <ErrorMessage title={title} message={error.message} />;
  };
  FallbackComponent.displayName = "FallbackComponent";
  return FallbackComponent;
};

FallbackComponentFactory.displayName = "FallbackComponentFactory";

// TODO probably better to create a remark/rehype plugin for this
const normalizeHref = (href: string, urlBase: string, filePath: string) => {
  let normalizedHref = href;

  if (filePath.endsWith("README.md") || filePath.endsWith("index.md")) {
    if (!href.startsWith(urlBase)) {
      if (href.startsWith("/")) {
        normalizedHref = `${urlBase}${href}`;
      } else if (href.startsWith("../")) {
        const parentPath = `/${filePath}`.split("/").slice(0, -2).join("/");
        normalizedHref = `${urlBase}${parentPath}/${href.replace("../", "")}`;
      } else {
        const parts = filePath.split("/");
        parts[parts.length - 1] = href.replace(/^\.\//, "");
        normalizedHref = `${urlBase}/${parts.join("/")}`;
      }
    }
  }
  return normalizedHref;
};
