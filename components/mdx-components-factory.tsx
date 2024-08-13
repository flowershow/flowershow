/* import { Mermaid as mermaid, Pre as pre } from "@portaljs/core"; */
/* import { ErrorBoundary } from "react-error-boundary"; */
import { ErrorMessage } from "@/components/error-message";
import { PageMetadata, isDatasetPage } from "@/server/api/types";
import { resolveLink } from "@/lib/resolve-link";
import { Site } from "@prisma/client";
import { env } from "@/env.mjs";
import { customEncodeUrl } from "@/lib/url-encoder";

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
} from "./portaljs-components";

import type {
  ExcelProps,
  FlatUiTableProps,
  IframeProps,
  LineChartProps,
  MapProps,
  PdfViewerProps,
  PlotlyBarChartProps,
  PlotlyLineChartProps,
} from "./portaljs-components";
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
    /* pre,
     * mermaid, */
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
      return <Catalog {...props} />;
    },
    Excel: (props: ExcelProps) => {
      props.data.url = resolveLink({
        link: props.data.url,
        filePath: metadata._path,
        prefixPath: pathToR2SiteFolder,
      });
      return <Excel {...props} />;
    },
    Iframe: (props: IframeProps) => {
      props.data.url = resolveLink({
        link: props.data.url,
        filePath: metadata._path,
        prefixPath: pathToR2SiteFolder,
      });
      return <Iframe {...props} />;
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
      return <LineChart {...props} />;
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

      return <Map {...props} layers={layers} />;
    },
    PdfViewer: (props: PdfViewerProps) => {
      props.data.url = resolveLink({
        link: props.data.url,
        filePath: metadata._path,
        prefixPath: pathToR2SiteFolder,
      });
      return <PdfViewer {...props} />;
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
      return <Plotly {...props} data={data} />;
    },
    PlotlyBarChart: (props: PlotlyBarChartProps) => {
      if (props.data.url) {
        props.data.url = resolveLink({
          link: props.data.url,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        });
      }
      return <PlotlyBarChart {...props} />;
    },
    PlotlyLineChart: (props: PlotlyLineChartProps) => {
      if (props.data.url) {
        props.data.url = resolveLink({
          link: props.data.url,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        });
      }
      return <PlotlyLineChart {...props} />;
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
      return <Vega {...props} spec={spec} />;
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
      return <VegaLite {...props} spec={spec} />;
    },
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
    }) => {
      return <FrictionlessView viewId={id} fullWidth={fullWidth} />;
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
