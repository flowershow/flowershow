import { VegaLite } from "@portaljs/components";
import type { Resource } from "@/components/layouts/datapackage-types";

type FrictionlessViewReturnType = ({
  viewId, // view index in the views array
  fullWidth,
}: {
  viewId: number;
  fullWidth?: boolean;
}) => JSX.Element;

interface View {
  resourceName: string;
  title: string;
  specType: string;
  spec: any;
}

export const FrictionlessViewFactory = ({
  views,
  resources,
  dataUrlBase,
}: {
  views: View[];
  resources: Resource[];
  dataUrlBase: string;
}): FrictionlessViewReturnType => {
  const FrictionlessView = ({ viewId, fullWidth = false }) => {
    const view = views[viewId];
    if (!view) {
      console.error(`View ${viewId} not found`);
      return <></>;
    }

    const resource =
      resources.find((r: any) => r.name === view.resourceName) ||
      resources[viewId];
    if (!resource) {
      console.error(`Resource not found for view id ${viewId}`);
      return <></>;
    }

    let vegaSpec;

    switch (view.specType) {
      case "simple": // TODO why?
        // TODO why?
        vegaSpec = convertSimpleToVegaLite(view, resource);
        break;
      // ... other conversions
    }

    // TODO temporary solution
    vegaSpec.data = {
      url: resource.path.startsWith("http")
        ? resource.path
        : `${dataUrlBase}/${resource.path}`,
    };

    return (
      <VegaLite
        fullWidth={fullWidth}
        spec={vegaSpec}
        actions={{ editor: false }}
        downloadFileName={resource.name}
      />
    );
  };

  FrictionlessView.displayName = "FrictionlessView";
  return FrictionlessView;
};

function convertSimpleToVegaLite(view, resource) {
  const x = resource.schema.fields.find((f) => f.name === view.spec.group);
  const y = resource.schema.fields.find((f) => f.name === view.spec.series[0]);

  const xType = inferVegaType(x.type);
  const yType = inferVegaType(y.type);

  let vegaLiteSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: {
      type: view.spec.type,
      color: "#6366F1",
      strokeWidth: 1,
      tooltip: true,
    },
    title: view.title,
    width: "container",
    height: 300,
    selection: {
      grid: {
        type: "interval",
        bind: "scales",
      },
    },
    encoding: {
      x: {
        field: x.name,
        type: xType,
      },
      y: {
        field: y.name,
        type: yType,
      },
    },
  };

  return vegaLiteSpec;
}

const inferVegaType = (fieldType) => {
  switch (fieldType) {
    case "date":
      return "Temporal";
    case "number":
      return "Quantitative";
  }
};
