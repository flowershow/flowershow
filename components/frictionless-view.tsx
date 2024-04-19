import dynamic from "next/dynamic";
import type {
  Resource,
  ResourceSchemaField,
  SimpleView,
} from "@/components/layouts/datapackage-types";
import { DatasetPageMetadata } from "@/server/api/types";

const VegaLite = dynamic(() =>
  import("@portaljs/components").then((mod) => mod.VegaLite),
);

type FrictionlessViewReturnType = ({
  viewId, // view index in the views array
  fullWidth,
}: {
  viewId: number;
  fullWidth?: boolean;
}) => JSX.Element;

export const FrictionlessViewFactory = (
  metadata: DatasetPageMetadata,
): FrictionlessViewReturnType => {
  const { views = [], resources, _rawUrlBase } = metadata;

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
        dataUrlBase={_rawUrlBase}
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
  if (!resource.schema) {
    throw new Error(`Resource \`${resource.name}\` has no schema`);
  }
  const x = resource.schema.fields.find((f) => f.name === view.spec.group);
  if (!x) {
    throw new Error(
      `Field \`${view.spec.group}\` not found in resource schema.`,
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

  // Type of "lines-and-points" is not supported by vega lite
  // We will use https://vega.github.io/vega-lite/docs/line.html#line-chart-with-point-markers instead
  const isLineAndPoints = view.spec.type === "lines-and-points";

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    /* mark: {
     *     type: view.spec.type,
     *     color: "#6366F1",
     *     strokeWidth: 1,
     *     tooltip: true,
     * }, */
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
      tooltip: [
        /* { "timeUnit": "yearmonthdate", "field": x.name }, */
        { field: y.name, type: yType },
        { field: x.name, type: xType },
      ],
    },
    layer: [
      {
        mark: {
          type: isLineAndPoints ? "line" : view.spec.type,
          point: isLineAndPoints,
          color: "#6366F1",
          strokeWidth: 1,
        },
        encoding: {
          y: {
            field: y.name,
            type: yType,
          },
        },
      },
      {
        mark: "rule",
        params: [
          {
            name: "hover",
            select: { type: "point", on: "pointerover" },
          },
        ],
        encoding: {
          color: {
            condition: {
              param: "hover",
              empty: false,
              value: "black",
            },
            value: "transparent",
          },
        },
      },
    ],
  };
}

const inferVegaType = (fieldType: ResourceSchemaField["type"]) => {
  const isSupportedFieldType =
    ["yearmonth", "date", "number"].indexOf(fieldType) !== -1;
  if (!isSupportedFieldType) {
    throw new Error(`Unsupported field type: ${fieldType}`);
  }

  switch (fieldType) {
    case "yearmonth":
    case "date":
      return "temporal";
    case "number":
      return "quantitative";
  }
};
