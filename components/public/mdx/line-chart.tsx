import Papa from 'papaparse';
import { useEffect, useState } from 'react';
import { VegaEmbedProps } from 'react-vega';
import LoadingSpinner from './loading-spinner';
import { Data } from './types';
import { SpecData, Vega } from './vega';

type AxisType = 'quantitative' | 'temporal';
type TimeUnit = 'year' | 'yearmonth' | undefined; // or ...

export type LineChartProps = {
  data: Omit<Data, 'csv'>;
  title?: string;
  xAxis: string;
  xAxisType?: AxisType;
  xAxisTimeUnit?: TimeUnit;
  yAxis: string | string[];
  yAxisType?: AxisType;
  fullWidth?: boolean;
  symbol?: string;
};

export function LineChart({
  data,
  title = '',
  xAxis,
  xAxisType = 'temporal',
  xAxisTimeUnit,
  yAxis,
  yAxisType = 'quantitative',
  symbol,
}: LineChartProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [specData, setSpecData] = useState<SpecData | null>({
    name: 'table',
    values: [],
  });
  const isMultiYAxis = Array.isArray(yAxis);

  useEffect(() => {
    const loadData = async () => {
      if (!data) return;
      setIsLoading(true);

      if (data.values) {
        setSpecData({
          name: 'table',
          values: data.values,
        });
      } else if (data.url) {
        try {
          const response = await fetch(data.url);
          const text = await response.text();

          const { data: rows } = Papa.parse<Record<string, unknown>>(text, {
            header: true,
            // Keep xAxis as string if it's temporal; let Papa auto-type other columns
            dynamicTyping: (field: string) =>
              !(xAxisType === 'temporal' && field === xAxis),
            skipEmptyLines: true,
          });

          setSpecData({
            name: 'table',
            values: rows as unknown[],
          });
        } catch (e) {
          // (Optional) You might want to surface an error UI here.
          console.error('Failed to load/parse CSV', e);
          setSpecData({ name: 'table', values: [] });
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, [data]);

  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    title,
    width: 'container',
    height: 300,
    mark: {
      type: 'line',
      color: 'black',
      strokeWidth: 1,
      tooltip: true,
    },
    data: specData ?? undefined,
    ...(isMultiYAxis
      ? {
          transform: [
            { fold: yAxis, as: ['key', 'value'] },
            { filter: 'datum.value != null && datum.value != ""' },
          ],
        }
      : {}),
    params: [
      {
        name: 'grid',
        select: { type: 'interval' },
      },
    ],
    encoding: {
      x: {
        field: xAxis,
        timeUnit: xAxisTimeUnit,
        type: xAxisType,
      },
      y: {
        field: isMultiYAxis ? 'value' : (yAxis as string),
        type: yAxisType,
      },
      ...(symbol
        ? {
            color: {
              field: symbol,
              type: 'nominal',
            },
          }
        : {}),
      ...(isMultiYAxis
        ? {
            color: {
              field: 'key',
              type: 'nominal',
            },
          }
        : {}),
    },
  } as VegaEmbedProps['spec'];

  return isLoading ? (
    <div className="flex h-[300px] w-[600px] w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  ) : (
    <Vega spec={spec} data={specData} />
  );
}
