import { VegaLite } from "react-vega";

export function LineChart({ data = [] }) {
    var tmp = data;
    if (Array.isArray(data)) {
        tmp = data.map((r, i) => {
            return { x: r[0], y: r[1] };
        });
    }
    const vegaData = { table: tmp };
    const spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        mark: "line" as const,
        data: {
            name: "table",
        },
        encoding: {
            x: {
                field: "x" as const,
                timeUnit: "year" as const,
                type: "temporal" as const,
            },
            y: {
                field: "y" as const,
                type: "quantitative" as const,
            },
        },
    };

    return <VegaLite data={vegaData} spec={spec} />;
}
