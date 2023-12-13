// FrictionlessView is a factory because we have to
// set the views and resources lists before using it

import { VegaLite } from "@portaljs/components"

export default function FrictionlessViewFactory({
    views = [],
    resources = [],
    dataUrlBase
}): ({
    viewId,
    fullWidth,
}: {
    viewId: number;
    fullWidth?: boolean;
}) => JSX.Element {
    const Frictionless = ({ viewId, fullWidth = false }) => {
        if (!(viewId in views)) {
            console.error(`View ${viewId} not found`);
            return <></>;
        }
        const view = views[viewId] as any;

        let resource;
        if (resources.length > 1) {
            resource = resources.find((r: any) => r.name === view.resourceName);
        } else {
            resource = resources[0];
        }

        if (!resource) {
            console.error(`Resource not found for view id ${viewId}`);
            return <></>;
        }

        let vegaSpec;
        switch (view.specType) {
            case "simple":
                vegaSpec = convertSimpleToVegaLite(view, resource);
                break;
            // ... other conversions
        }

        // TODO temporary solution
        vegaSpec.data = { url: resource.path.startsWith("http") ? resource.path : `${dataUrlBase}/${resource.path}` };

        return (
            <VegaLite
                fullWidth={fullWidth}
                spec={vegaSpec}
                actions={{ editor: false }}
                downloadFileName={resource.name}
            />
        );
    };

    Frictionless.displayName = "FrictionlessView";
    return Frictionless;
}

function convertSimpleToVegaLite(view, resource) {
    const x = resource.schema.fields.find((f) => f.name === view.spec.group);
    const y = resource.schema.fields.find((f) => f.name === view.spec.series[0]);

    const xType = inferVegaType(x.type);
    const yType = inferVegaType(y.type);

    let vegaLiteSpec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        mark: {
            type: view.spec.type,
            color: "black",
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
