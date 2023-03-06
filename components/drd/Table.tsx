import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";

import React, { useEffect, useMemo, useState } from "react";

import loadUrlProxied from "../../lib/loadUrlProxied";
import parseCsv from "../../lib/parseCsv";

const Table = ({
  data: ogData = [],
  cols: ogCols = [],
  csv = "",
  url = "",
}) => {
  if (csv) {
    const out = parseCsv(csv);
    ogData = out.rows;
    ogCols = out.fields;
  }

  const [data, setData] = React.useState(ogData);
  const [cols, setCols] = React.useState(ogCols);
  const [error, setError] = React.useState(""); //  TODO: add error handling

  const tableCols = useMemo(() => {
    const columnHelper = createColumnHelper();
    return cols.map((c) =>
      columnHelper.accessor(c.key, {
        header: () => c.name,
        cell: (info) => info.getValue(),
      })
    );
  }, [data, cols]);

  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns: tableCols,
    getCoreRowModel: getCoreRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
  });

  useEffect(() => {
    if (url) {
      loadUrlProxied(url).then((data) => {
        const { rows, fields } = parseCsv(data);
        setData(rows);
        setCols(fields);
      });
    }
  }, [url]);

  return (
    <div>
      <table>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id}>
              {r.getVisibleCells().map((c) => (
                <td key={c.id}>
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
