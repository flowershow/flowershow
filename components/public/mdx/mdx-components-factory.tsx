import type { Blob } from '@prisma/client';
import type { MDXComponents } from 'next-mdx-remote-client/rsc';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorMessage from '@/components/public/error-message';
import { getSiteUrlPath } from '@/lib/get-site-url';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import { PublicSite } from '@/server/api/types';
import type { CustomHtmlProps } from './custom-html';
import type { FlatUiTableProps } from './flatui-table';
import FsImage from './fs-image';
import type { LineChartProps } from './line-chart';
import type { ListProps } from './list';
import List from './list';
import {
  CustomHtml,
  FlatUiTable,
  LineChart,
  Mermaid,
  ObsidianBasesViews,
  Plotly,
  PlotlyBarChart,
  PlotlyLineChart,
  Vega,
} from './mdx-client-components';
import type { ObsidianBasesViewsProps } from './obsidian-bases-views';
import { PdfViewer } from './pdf-viewer';
import type { PlotlyBarChartProps } from './plotly-bar-chart';
import type { PlotlyLineChartProps } from './plotly-line-chart';
import Pre from './pre';

export const mdxComponentsFactory = ({
  blob,
  site,
}: {
  blob: Blob;
  site: PublicSite;
}) => {
  const components: MDXComponents = {
    img: (props: any) => <FsImage {...props} />,
    pre: (props: any) => <Pre {...props} />,
    iframe: (props) => {
      const src = props.src ?? '';

      const isPdf =
        typeof src === 'string' && src.split('#')[0]?.endsWith('.pdf');

      if (isPdf) {
        return <PdfViewer src={src} />;
      }

      return <iframe {...props} />;
    },
    CustomHtml: withErrorBoundary((props: CustomHtmlProps) => {
      return <CustomHtml {...props} />;
    }, 'CustomHtml'),
    List: withErrorBoundary((props: ListProps) => {
      return <List {...props} siteId={site.id} />;
    }, 'List'),
    mermaid: Mermaid as any,
    FlatUiTable: withErrorBoundary((props: FlatUiTableProps) => {
      if (props.data?.url)
        props.data.url = resolveFilePathToUrlPath({
          target: props.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });

      return <FlatUiTable {...props} />;
    }, 'FlatUiTable'),
    LineChart: withErrorBoundary((props: LineChartProps) => {
      if (props.data?.url) {
        props.data.url = resolveFilePathToUrlPath({
          target: props.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      }
      return <LineChart {...props} />;
    }, 'LineChart'),
    PlotlyBarChart: withErrorBoundary((props: PlotlyBarChartProps) => {
      if (props.data.url) {
        props.data.url = resolveFilePathToUrlPath({
          target: props.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      }
      return <PlotlyBarChart {...props} />;
    }, 'PlotlyBarChart'),
    PlotlyLineChart: withErrorBoundary((props: PlotlyLineChartProps) => {
      if (props.data.url) {
        props.data.url = resolveFilePathToUrlPath({
          target: props.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      }
      return <PlotlyLineChart {...props} />;
    }, 'PlotlyLineChart'),
    // Excel: withErrorBoundary((props: ExcelProps) => {
    //   props.data.url = resolveFilePathToUrlPath({
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
    //       layer.data.url = resolveFilePathToUrlPath({
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
        typeof props.data === 'string'
          ? resolveFilePathToUrlPath({
              target: props.data,
              originFilePath: blob.path,
              sitePrefix: getSiteUrlPath(site),
              domain: site.customDomain,
            })
          : props.data;
      return <Plotly {...props} data={data} />;
    }, 'Plotly'),
    Vega: withErrorBoundary((props) => {
      if (props.spec.data.url)
        props.spec.data.url = resolveFilePathToUrlPath({
          target: props.spec.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      return <Vega {...props} />;
    }, 'Vega'),
    // TODO this is not needed
    VegaLite: withErrorBoundary((props) => {
      if (props.spec.data.url)
        props.spec.data.url = resolveFilePathToUrlPath({
          target: props.spec.data.url,
          originFilePath: blob.path,
          sitePrefix: getSiteUrlPath(site),
          domain: site.customDomain,
        });
      return <Vega {...props} />;
    }, 'VegaLite'),
    ObsidianBasesViews: withErrorBoundary((props: ObsidianBasesViewsProps) => {
      return <ObsidianBasesViews {...props} />;
    }, 'ObsidianBasesViews'),
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
  WrappedComponent.displayName = 'ErrorBoundary';
  return WrappedComponent;
};
