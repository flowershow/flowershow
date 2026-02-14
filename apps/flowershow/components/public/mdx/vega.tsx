'use client';
import { useEffect, useRef } from 'react';
import { useVegaEmbed, VegaEmbedProps } from 'react-vega';

export interface SpecData {
  name: string; // "table"
  values: unknown[];
}

export function Vega({
  spec,
  data,
}: {
  spec: VegaEmbedProps['spec'];
  data?: SpecData | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const embed = useVegaEmbed({
    ref,
    spec,
    options: { actions: true },
  });

  useEffect(() => {
    if (!embed || !data) return;
    // Make sure the named dataset exists in the spec: data: { name: "table" }
    embed.view.data('table', data.values).runAsync();
  }, [embed, data]);

  // ⬇️ Ensure the container has width so width:"container" is non-zero
  return <div ref={ref} style={{ width: '100%' }} />;
}
