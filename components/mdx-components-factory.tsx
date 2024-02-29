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

export const mdxComponentsFactory = ({
  frontMatter,
  dataUrlBase,
}: {
  frontMatter: any;
  dataUrlBase: string;
}) => {
  const components: any = {
    /* HTML elements */
    a: ({ href, children, ...rest }) => {
      // TODO what was that?
      const processedHref = href.replace(/\.[^/.]+$/, "");
      return (
        <a href={processedHref} {...rest}>
          {children}
        </a>
      );
    },
    img: (props) => {
      return (
        <img {...props} src={resolveRelativeUrl(props.src, dataUrlBase)} />
      );
    },
    table: (props) => (
      <div className="overflow-x-auto">
        <table {...props} />
      </div>
    ),
    /* Custom components */
    pre,
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
          <Excel {...props} url={resolveRelativeUrl(props.url, dataUrlBase)} />
        </ErrorBoundary>
      );
    },
    FlatUiTable: (props: FlatUiTableProps) => {
      let url = props.url;
      if (url) {
        url = resolveRelativeUrl(url, dataUrlBase);
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
        data = resolveRelativeUrl(data, dataUrlBase);
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
            url={resolveRelativeUrl(props.url, dataUrlBase)}
          />
        </ErrorBoundary>
      );
    },
    Vega: (props) => {
      let spec = props.spec;
      if (spec.data.URL) {
        spec.data.URL = resolveRelativeUrl(spec.data.URL, dataUrlBase);
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
        spec.data.URL = resolveRelativeUrl(spec.data.URL, dataUrlBase);
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

  if (frontMatter.datapackage) {
    const FrictionlessView = FrictionlessViewFactory({
      views: frontMatter.datapackage.views,
      resources: frontMatter.datapackage.resources,
      dataUrlBase,
    });
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
  }
  return components;
};

const resolveRelativeUrl = (url: string, urlPrefix: string) => {
  return url.startsWith("http")
    ? url
    : `${urlPrefix}/${url.replace(/^\/+/g, "")}`;
};

const FallbackComponentFactory =
  ({ title }: { title: string }) =>
  ({ error }: { error: Error }) => {
    return <ErrorMessage title={title} message={error.message} />;
  };
