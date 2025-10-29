import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import Papa from "papaparse";
import { Grid } from "@githubocto/flat-ui";
import LoadingSpinner from "./loading-spinner";
import { Data } from "./types";

const queryClient = new QueryClient();

export async function getCsv(url: string, bytes) {
  const response = await fetch(url, {
    headers: {
      Range: `bytes=0-${bytes}`,
    },
  });
  const data = await response.text();
  return data;
}

export async function parseCsv(file: string, parsingConfig): Promise<any> {
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

export interface FlatUiTableProps {
  data: Data;
  uniqueId?: number;
  bytes: number;
  parsingConfig: any;
}

export const FlatUiTable: React.FC<FlatUiTableProps> = ({
  data,
  uniqueId,
  bytes = 5132288,
  parsingConfig = {},
}) => {
  uniqueId = uniqueId ?? Math.random();
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <TableInner
        bytes={bytes}
        data={data}
        uniqueId={uniqueId}
        parsingConfig={parsingConfig}
      />
    </QueryClientProvider>
  );
};

const TableInner: React.FC<FlatUiTableProps> = ({
  data,
  uniqueId,
  bytes,
  parsingConfig,
}) => {
  const url = data.url;
  const csv = data.csv;
  const values = data.values;

  const { data: csvString, isLoading: isDownloadingCSV } = useQuery(
    ["dataCsv", url, uniqueId],
    () => getCsv(url as string, bytes),
    { enabled: !!url },
  );

  const { data: parsedData, isLoading: isParsing } = useQuery(
    ["dataPreview", csvString, uniqueId],
    () =>
      parseCsv(csv ? (csv as string) : (csvString as string), parsingConfig),
    { enabled: csv ? true : !!csvString },
  );

  if (values) {
    return (
      <div className="w-full" style={{ height: "500px" }}>
        <Grid data={values} />
      </div>
    );
  }

  if (isParsing || isDownloadingCSV)
    return (
      <div className="flex h-[500px] w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  if (parsedData)
    return (
      <div className="w-full" style={{ height: "500px" }}>
        <Grid data={parsedData.data} />
      </div>
    );

  return (
    <div className="flex h-[500px] w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  );
};
