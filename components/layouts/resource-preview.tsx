import { ErrorBoundary } from "react-error-boundary";
import { type Resource } from "./datapackage-types";
import { Map } from "@portaljs/components";
import { FallbackComponentFactory } from "./fallback-component-factory";
import dynamic from "next/dynamic";

export const FlatUiTable = dynamic(() =>
  import("@portaljs/components").then((mod) => mod.FlatUiTable),
);

export const ResourcePreview = ({
  resource,
  rawUrlBase,
}: {
  resource: Resource;
  rawUrlBase: string;
}) => {
  const resourceTitle = resource.title || resource.name || resource.path;
  const resourceDataUrl = `${rawUrlBase}/${resource.path}`;

  return (
    <div
      data-testId="dp-preview"
      key={`resource-preview-${resource.name}`}
      className="mt-10"
    >
      <h3 id={resourceTitle}>{resourceTitle}</h3>

      <ErrorBoundary
        FallbackComponent={FallbackComponentFactory({
          title: `Error in resource preview \`${resource.name}\`:`,
        })}
      >
        {resource.format === "csv" ? (
          <div className="not-prose md:text-base">
            {/* @ts-expect-error */}
            <FlatUiTable
              data={{
                url: `${rawUrlBase}/${resource.path}`,
              }}
            />
          </div>
        ) : resource.format === "geojson" ? (
          <Map
            center={{
              latitude: 45,
              longitude: 0,
            }}
            layers={[
              {
                data: { url: resourceDataUrl },
                name: "Polygons",
                tooltip: {
                  propNames: ["name"],
                },
                colorScale: {
                  starting: "#ff0000",
                  ending: "#00ff00",
                },
              },
            ]}
            title={resourceTitle}
            zoom={2}
          />
        ) : (
          <div>Unsupported data preview format `{resource.format}`</div>
        )}
      </ErrorBoundary>
    </div>
  );
};
