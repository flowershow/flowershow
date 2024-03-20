import { Mermaid as mermaid, Pre as pre } from "@portaljs/core";
import {
  BucketViewer,
  Catalog,
  Excel,
  ExcelProps,
  FlatUiTable,
  FlatUiTableProps,
  LineChart,
  LineChartProps,
  Map,
  PdfViewer,
  PdfViewerProps,
  Vega,
  VegaLite,
} from "@portaljs/components";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorMessage } from "@/components/error-message";
import { FrictionlessViewFactory } from "./frictionless-view";
import { PageMetadata, isDatasetPage } from "@/server/api/types";

export const mdxComponentsFactory = (metadata: PageMetadata) => {
  const components: any = {
    /* HTML elements */
    a: ({ href, children, ...rest }) => {
      // TODO what was that?
      const processedHref = href.replace(/\.[^/.]+$/, "");
      const isExternal = processedHref.startsWith("http");
      return (
        <a
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          href={processedHref}
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
    Vega: (props) => {
      let spec = props.spec;
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
      let spec = props.spec;
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
