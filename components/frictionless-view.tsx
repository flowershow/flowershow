import { VegaLite } from "@portaljs/components";
import type {
  Resource,
  ResourceSchemaField,
  SimpleView,
  View,
} from "@/components/layouts/datapackage-types";

type FrictionlessViewReturnType = ({
  viewId, // view index in the views array
  fullWidth,
}: {
  viewId: number;
  fullWidth?: boolean;
}) => JSX.Element;

export const FrictionlessViewFactory = ({
  views,
  resources,
  dataUrlBase, // TODO temporary(?) solution for relative paths
}: {
  views: SimpleView[]; // TODO support classic/original DataPackage spec view?
  resources: Resource[];
  dataUrlBase: string;
}): FrictionlessViewReturnType => {
  const View = ({
    viewId,
    fullWidth = false,
  }: {
    viewId: number;
    fullWidth?: boolean;
  }) => {
    const view = views[viewId];
    if (!view) {
      throw new Error(`View ${viewId} not found`);
    }

    const resource = resources[viewId];
    if (!resource) {
      throw new Error(`Resource not found for view id ${viewId}`);
    }

    return (
      <FrictionlessView
        view={view}
        resource={resource}
        dataUrlBase={dataUrlBase}
        fullWidth={fullWidth}
      />
    );
  };
  return View;
};

interface FrictionlessViewProps {
  view: SimpleView; // TODO support classic/original DataPackage spec view ?
  resource: Resource;
  dataUrlBase?: string; // TODO temporary(?) solution for relative paths
  fullWidth?: boolean;
}

export const FrictionlessView: React.FC<FrictionlessViewProps> = ({
  view,
  resource,
  dataUrlBase = "",
  fullWidth = false,
}) => {
  const vegaSpec = convertSimpleViewToVegaLite({ view, resource });

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

// TODO import it from @portaljs/components
interface VegaLiteSpec {
  [key: string]: any;
}

function convertSimpleViewToVegaLite({
  view,
  resource,
}: {
  view: SimpleView;
  resource: Resource;
}): VegaLiteSpec {
  // TODO schema schould be optional according to the spec but is required in the current implementation
  const x = resource.schema.fields.find((f) => f.name === view.spec.group);
  if (!x) {
    throw new Error(
      `Field \`${view.spec.group}\` not found in resource schema`,
    );
  }
  // TODO why is this hard coded to index 0?
  const y = resource.schema.fields.find((f) => f.name === view.spec.series[0]);
  if (!y) {
    throw new Error(
      `Field \`${view.spec.series[0]}\` not found in resource \`${resource.name}\` schema`,
    );
  }

  const xType = inferVegaType(x.type);
  const yType = inferVegaType(y.type);

  return {
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
}

const inferVegaType = (fieldType: ResourceSchemaField["type"]) => {
  switch (fieldType) {
    case "date":
      return "Temporal";
    case "number":
      return "Quantitative";
  }
};
