"use client";
import dynamic from "next/dynamic";
import { Mermaid as mermaid, Pre as pre } from "@portaljs/core";
import type {
  ExcelProps,
  FlatUiTableProps,
  IframeProps,
  LineChartProps,
  MapProps,
  PdfViewerProps,
  PlotlyBarChartProps,
  PlotlyLineChartProps,
} from "@portaljs/components";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorMessage } from "@/components/error-message";
import { FrictionlessViewFactory } from "./frictionless-view";
import { PageMetadata, isDatasetPage } from "@/server/api/types";
import { resolveLink } from "@/lib/resolve-link";
import { Site } from "@prisma/client";
import { env } from "@/env.mjs";
import { customEncodeUrl } from "@/lib/url-encoder";

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
const Iframe = dynamic(() =>
  import("@portaljs/components").then((module) => ({
    default: module.Iframe,
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
  const pathToR2SiteFolder = `https://${env.NEXT_PUBLIC_R2_BUCKET_DOMAIN}/${siteMetadata.id}/${siteMetadata.gh_branch}/raw`;

  const components: any = {
    /* HTML elements */
    a: ({
      href,
      children,
      ...rest
    }: React.LinkHTMLAttributes<HTMLAnchorElement>) => {
      if (!href) {
        return <a {...rest}>{children}</a>;
      }

      const isExternal = href.startsWith("http");
      const isHeading = href.startsWith("#");

      const _href = isHeading
        ? href
        : resolveLink({
            link: isExternal ? href : customEncodeUrl(href),
            filePath: metadata._path,
            prefixPath: siteMetadata.customDomain
              ? ""
              : `/@${siteMetadata.user!.gh_username}/${
                  siteMetadata.projectName
                }`,
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
      if (!props.src) {
        return <img {...props} />;
      }

      const normalizedSrc = resolveLink({
        link: props.src,
        filePath: metadata._path,
        prefixPath: pathToR2SiteFolder,
      });

      return <img {...props} src={normalizedSrc} />;
    },
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="overflow-x-auto">
        <table {...props} />
      </div>
    ),
    /* Custom components */
    pre,
    mermaid,
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
    Excel: (props: ExcelProps) => {
      props.data.url = resolveLink({
        link: props.data.url,
        filePath: metadata._path,
        prefixPath: pathToR2SiteFolder,
      });
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`Excel` component error:",
          })}
        >
          <Excel {...props} />
        </ErrorBoundary>
      );
    },
    Iframe: (props: IframeProps) => {
      props.data.url = resolveLink({
        link: props.data.url,
        filePath: metadata._path,
        prefixPath: pathToR2SiteFolder,
      });
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`Excel` component error:",
          })}
        >
          <Iframe {...props} />
        </ErrorBoundary>
      );
    },
    FlatUiTable: (props: FlatUiTableProps) => {
      if (props.data.url) {
        props.data.url = resolveLink({
          link: props.data.url,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        });
      }
      return <FlatUiTable {...props} />;
    },
    LineChart: (props: LineChartProps) => {
      if (props.data.url) {
        props.data.url = resolveLink({
          link: props.data.url,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        });
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`LineChart` component error:",
          })}
        >
          <LineChart {...props} />
        </ErrorBoundary>
      );
    },
    Map: (props: MapProps) => {
      const layers = props.layers.map((layer) => {
        if (layer.data.url) {
          layer.data.url = resolveLink({
            link: layer.data.url,
            filePath: metadata._path,
            prefixPath: pathToR2SiteFolder,
          });
        }
        return layer;
      });

      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`Map` component error:",
          })}
        >
          <Map {...props} layers={layers} />
        </ErrorBoundary>
      );
    },
    PdfViewer: (props: PdfViewerProps) => {
      props.data.url = resolveLink({
        link: props.data.url,
        filePath: metadata._path,
        prefixPath: pathToR2SiteFolder,
      });
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`PdfViewer` component error:",
          })}
        >
          <PdfViewer {...props} />
        </ErrorBoundary>
      );
    },
    Plotly: (props) => {
      let data = props.data;
      if (typeof data === "string") {
        data = resolveLink({
          link: data,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        });
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
      if (props.data.url) {
        props.data.url = resolveLink({
          link: props.data.url,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        });
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`PlotlyBarChart` component error:",
          })}
        >
          <PlotlyBarChart {...props} />
        </ErrorBoundary>
      );
    },
    PlotlyLineChart: (props: PlotlyLineChartProps) => {
      if (props.data.url) {
        props.data.url = resolveLink({
          link: props.data.url,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        });
      }
      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponentFactory({
            title: "`PlotlyLineChart` component error:",
          })}
        >
          <PlotlyLineChart {...props} />
        </ErrorBoundary>
      );
    },
    Vega: (props) => {
      const spec = props.spec;
      if (spec.data.URL) {
        spec.data.URL = resolveLink({
          link: spec.data.URL,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        });
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
        spec.data.URL = resolveLink({
          link: spec.data.URL,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        });
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
    // TODO
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

const FallbackComponentFactory = ({ title }: { title: string }) => {
  const FallbackComponent = ({ error }: { error: Error }) => {
    return <ErrorMessage title={title} message={error.message} />;
  };
  FallbackComponent.displayName = "FallbackComponent";
  return FallbackComponent;
};

FallbackComponentFactory.displayName = "FallbackComponentFactory";
