import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import { Plotly } from "./plotly";
import Papa, { ParseConfig } from "papaparse";
import LoadingSpinner from "./loading-spinner";
import { Data } from "./types";

const queryClient = new QueryClient();

export interface PlotlyBarChartProps {
  data: Data;
  uniqueId?: number;
  bytes?: number;
  parsingConfig?: ParseConfig;
  xAxis: string;
  yAxis: string;
  title?: string;
}

export const PlotlyBarChart: React.FC<PlotlyBarChartProps> = ({
  data,
  bytes = 5132288,
  parsingConfig = {},
  xAxis,
  yAxis,
  title = "",
}) => {
  const uniqueId = Math.random();
  return (
    <QueryClientProvider client={queryClient}>
      <PlotlyBarChartInner
        data={data}
        uniqueId={uniqueId}
        bytes={bytes}
        parsingConfig={parsingConfig}
        xAxis={xAxis}
        yAxis={yAxis}
        title={title}
      />
    </QueryClientProvider>
  );
};

const PlotlyBarChartInner: React.FC<PlotlyBarChartProps> = ({
  data,
  uniqueId,
  bytes,
  parsingConfig,
  xAxis,
  yAxis,
  title,
}) => {
  const { data: csvString, isLoading: isDownloadingCSV } = useQuery(
    ["dataCsv", data.url, uniqueId],
    () => getCsv(data.url as string, bytes ?? 5132288),
    { enabled: !!data.url },
  );

  const { data: parsedData, isLoading: isParsing } = useQuery(
    ["dataPreview", csvString, uniqueId],
    () =>
      parseCsv(
        data.csv ? (data.csv as string) : (csvString as string),
        parsingConfig ?? {},
      ),
    { enabled: data.csv ? true : !!csvString },
  );

  if (data.values) {
    return (
      <div className="w-full" style={{ height: "500px" }}>
        <Plotly
          layout={{
            title,
          }}
          data={[
            {
              x: data.values.map((d) => d[xAxis]),
              y: data.values.map((d) => d[yAxis]),
              type: "bar",
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
              type: "bar",
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
