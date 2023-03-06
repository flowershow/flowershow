import axios from "axios";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React, { useEffect, useMemo, useState } from "react";

const papa = require("papaparse");

/*
  Simple HTML Table
  usage: <OutTable data={data} cols={cols} />
    data:Array<Array<any> >;
    cols:Array<{name:string, key:number|string}>;
*/
export default function Table({ data = [], cols = [], csv = "", url = "" }) {
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
      loadUrl(url);
    }
  }, [url]);

  function loadUrl(path) {
    // HACK: duplicate of Excel code - maybe refactor
    // if url is external may have CORS issue so we proxy it ...
    if (url.startsWith("http")) {
      const PROXY_URL = window.location.origin + "/api/proxy";
      url = PROXY_URL + "?url=" + encodeURIComponent(url);
    }
    axios.get(url).then((res) => {
      const { rows, fields } = parseCsv(res.data);
      setData(rows);
      setCols(fields);
    });
  }

  return (
    <>
      <SimpleTable data={ourdata} cols={ourcols} />
    </>
  );
}

/*
  Simple HTML Table
  usage: <OutTable data={data} cols={cols} />
    data:Array<Array<any> >;
    cols:Array<{name:string, key:number|string}>;
*/
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

function parseCsv(csv) {
  csv = csv.trim();
  const rawdata = papa.parse(csv, { header: true });
  const cols = rawdata.meta.fields.map((r, i) => {
    return { key: r, name: r };
  });

  return {
    rows: rawdata.data,
    fields: cols,
  };
}
