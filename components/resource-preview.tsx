import { type Resource } from "./layouts/datapackage-types";
import { FlatUiTable, Map } from "@/components/client-components-wrapper";

export const ResourcePreview: React.FC<{ resource: Resource }> = ({
  resource,
}) => {
  const resourceTitle = resource.title || resource.name || resource.path;

  return (
    <div
      data-testid="dp-preview"
      key={`resource-preview-${resource.name}`}
      className="mt-10"
    >
      <h3 id={resourceTitle}>{resourceTitle}</h3>

      {resource.format === "csv" ? (
        <div className="not-prose md:text-base">
          {/* @ts-expect-error */}
          <FlatUiTable
            data={{
              url: resource.path,
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
              data: { url: resource.path },
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
    </div>
  );
};
