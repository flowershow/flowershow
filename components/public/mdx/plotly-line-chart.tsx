import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import { Plotly } from "./plotly";
import Papa, { ParseConfig } from "papaparse";
import LoadingSpinner from "./loading-spinner";
import { Data } from "./types";

const queryClient = new QueryClient();

export interface PlotlyLineChartProps {
  data: Data;
  bytes?: number;
  parsingConfig?: ParseConfig;
  xAxis: string;
  yAxis: string;
  lineLabel?: string;
  title?: string;
  uniqueId?: number;
}

export const PlotlyLineChart: React.FC<PlotlyLineChartProps> = ({
  data,
  bytes = 5132288,
  parsingConfig = {},
  xAxis,
  yAxis,
  lineLabel,
  title = "",
  uniqueId,
}) => {
  uniqueId = uniqueId ?? Math.random();
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <LineChartInner
        data={data}
        uniqueId={uniqueId}
        bytes={bytes}
        parsingConfig={parsingConfig}
        xAxis={xAxis}
        yAxis={yAxis}
        lineLabel={lineLabel ?? yAxis}
        title={title}
      />
    </QueryClientProvider>
  );
};

const LineChartInner: React.FC<PlotlyLineChartProps> = ({
  data,
  uniqueId,
  bytes,
  parsingConfig,
  xAxis,
  yAxis,
  lineLabel,
  title,
}) => {
  const values = data.values;
  const url = data.url;
  const csv = data.csv;

  const { data: csvString, isLoading: isDownloadingCSV } = useQuery(
    ["dataCsv", url, uniqueId],
    () => getCsv(url as string, bytes ?? 5132288),
    { enabled: !!url },
  );
  const { data: parsedData, isLoading: isParsing } = useQuery(
    ["dataPreview", csvString, uniqueId],
    () =>
      parseCsv(
        csv ? (csv as string) : (csvString as string),
        parsingConfig ?? {},
      ),
    { enabled: csv ? true : !!csvString },
  );

  if (values) {
    return (
      <div className="w-full" style={{ height: "500px" }}>
        <Plotly
          layout={{
            title,
          }}
          data={[
            {
              x: values.map((d) => d[xAxis]),
              y: values.map((d) => d[yAxis]),
              mode: "lines",
              name: lineLabel,
            },
          ]}
        />
      </div>
    );
  }

  if (isParsing || isDownloadingCSV)
    <div className="flex h-[500px] w-full items-center justify-center">
      <LoadingSpinner />
    </div>;
  if (parsedData)
    return (
      <div className="w-full" style={{ height: "500px" }}>
        <Plotly
          layout={{
            title,
          }}
          data={[
            {
              x: parsedData.data.map((d: any) => d[xAxis]),
              y: parsedData.data.map((d: any) => d[yAxis]),
              mode: "lines",
              name: lineLabel,
            },
          ]}
        />
      </div>
    );
  return (
    <div className="flex h-[500px] w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  );
};

async function getCsv(url: string, bytes: number) {
  const response = await fetch(url, {
    headers: {
      Range: `bytes=0-${bytes}`,
    },
  });
  const data = await response.text();
  return data;
}

async function parseCsv(
  file: string,
  parsingConfig: ParseConfig,
): Promise<any> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      ...parsingConfig,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transform: (value: string): string => {
        return value.trim();
      },
      complete: (results: any) => {
        return resolve(results);
      },
      error: (error: any) => {
        return reject(error);
      },
    });
  });
}
