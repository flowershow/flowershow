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

const Table = ({ data = [], cols = [], csv = "", url = "" }) => {
  if (csv) {
    const out = parseCsv(csv);
    data = out.rows;
    cols = out.fields;
  }

  const [ourdata, setData] = React.useState(data);
  const [ourcols, setCols] = React.useState(cols);
  const [error, setError] = React.useState("");

  useEffect(() => {
    if (url) {
      //  TODO: check if this is working properly
      loadUrlProxied(url).then((data) => {
        console.log(data);
        const { rows, fields } = parseCsv(data);
        setData(rows);
        setCols(fields);
      });
    }
  }, [url]);

  return (
    <>
      <SimpleTable data={ourdata} cols={ourcols} />
    </>
  );
};

function SimpleTable({ data = [], cols = [] }) {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper();
    return cols.map((c) =>
      columnHelper.accessor(c.key, {
        header: () => c.name,
        cell: (info) => info.getValue(),
      })
    );
  }, []);

  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
  });

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
}

export default Table;
