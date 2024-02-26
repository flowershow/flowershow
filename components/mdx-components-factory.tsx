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
    BucketViewer,
    Catalog,
    Map,
    Excel: (props: ExcelProps) => {
      return (
        <Excel {...props} url={resolveRelativeUrl(props.url, dataUrlBase)} />
      );
    },
    FlatUiTable: (props: FlatUiTableProps) => {
      if (props.url) {
        props.url = resolveRelativeUrl(props.url, dataUrlBase);
      }
      return <FlatUiTable {...props} />;
    },
    LineChart: (props: LineChartProps) => {
      if (typeof props.data === "string") {
        props.data = resolveRelativeUrl(props.data, dataUrlBase);
      }
      return <LineChart {...props} />;
    },
    PdfViewer: (props: PdfViewerProps) => {
      return (
        <PdfViewer
          {...props}
          url={resolveRelativeUrl(props.url, dataUrlBase)}
        />
      );
    },
    Vega: (props) => {
      if (props.spec.data.URL) {
        props.spec.data.URL = resolveRelativeUrl(
          props.spec.data.URL,
          dataUrlBase,
        );
      }
      return <Vega {...props} />;
    },
    VegaLite: (props) => {
      if (props.spec.data.URL) {
        props.spec.data.URL = resolveRelativeUrl(
          props.spec.data.URL,
          dataUrlBase,
        );
      }
      return <VegaLite {...props} />;
    },
  };

  if (frontMatter.datapackage) {
    components.FrictionlessView = FrictionlessViewFactory({
      views: frontMatter.datapackage.views,
      resources: frontMatter.datapackage.resources,
      dataUrlBase,
    });
  }
  return components;
};

const resolveRelativeUrl = (url: string, urlPrefix: string) => {
  return url.startsWith("http")
    ? url
    : `${urlPrefix}/${url.replace(/^\/+/g, "")}`;
};
