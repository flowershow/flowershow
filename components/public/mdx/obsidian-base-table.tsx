"use client";

import React from "react";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { getWikiLinkValue, isWikiLink } from "@/lib/wiki-link";
import { resolveWikiLinkToFilePath } from "@/lib/resolve-wiki-link";
import { resolveFilePathToUrlPath } from "@/lib/resolve-link";

type Column = string;
type Row = {
  path: string;
  appPath: string;
  metadata: Record<string, any>;
};

export interface ObsidianBaseTableProps {
  columns: string;
  rows: string;
  sitePrefix?: string;
  summaries?: string;
  allSitePaths?: string;
}

export const ObsidianBaseTable: React.FC<ObsidianBaseTableProps> = (props) => {
  const columns = JSON.parse(props.columns) as Column[];
  const rows = JSON.parse(props.rows) as Row[];
  const sitePrefix = props.sitePrefix;
  const summaries = props.summaries
    ? (JSON.parse(props.summaries) as Record<
        string,
        { value: number | string | null; function: string }
      >)
    : undefined;
  const allSitePaths = props.allSitePaths
    ? (JSON.parse(props.allSitePaths) as string[])
    : [];

  if (rows.length === 0) {
    return (
      <Box
        sx={{
          my: 2,
          p: 2,
          textAlign: "center",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "background.default",
        }}
      >
        <Typography color="text.secondary">No results found</Typography>
      </Box>
    );
  }

  const getCellValue = (row: Row, col: Column) => {
    if (col === "file.name") {
      // Extract filename from path
      const pathParts = row.path.split("/");
      const fileName =
        pathParts[pathParts.length - 1]?.replace(/\.(md|mdx)$/, "") || "";

      // Create a link using appPath with sitePrefix
      const linkUrl = `${sitePrefix}/${row.appPath || ""}`;

      return (
        <Link
          href={linkUrl}
          style={{
            color: "#1976d2",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          {fileName}
        </Link>
      );
    }

    // Get value from metadata
    const value = row.metadata?.[col];

    if (value === null || value === undefined) {
      return (
        <Typography component="span" color="text.disabled">
          —
        </Typography>
      );
    }

    if (isWikiLink(value)) {
      const target = getWikiLinkValue(value);
      const filePath = resolveWikiLinkToFilePath({
        wikiLink: value,
        filePaths: allSitePaths,
      });
      const urlPath = resolveFilePathToUrlPath({
        target: filePath,
        sitePrefix,
      });

      return (
        <Link
          href={urlPath}
          style={{
            color: "#1976d2",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          {target}
        </Link>
      );
    }

    return String(value);
  };

  const getDisplayName = (col: string) => {
    if (col === "file.name") return "Name";
    // Capitalize first letter and replace underscores with spaces
    return col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, " ");
  };

  const formatSummaryValue = (value: number | string | null): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") {
      // Round to 2 decimal places if it's a decimal number
      return value % 1 === 0 ? value.toString() : value.toFixed(2);
    }
    // For dates, format them nicely
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString();
      } catch {
        return value;
      }
    }
    return String(value);
  };

  // Transform columns into DataGrid column definitions
  const gridColumns: GridColDef[] = columns.map((col) => ({
    field: col,
    headerName: getDisplayName(col),
    flex: 1,
    minWidth: 150,
    valueGetter: (value: any, row: any) => {
      // Check if this is the summary row
      if (row.id === "__summary__") {
        const summary = summaries?.[col];
        if (!summary) return "";
        return `${summary.function}: ${formatSummaryValue(summary.value)}`;
      }
      const typedRow = row as Row;
      if (col === "file.name") {
        const pathParts = typedRow.path.split("/");
        return (
          pathParts[pathParts.length - 1]?.replace(/\.(md|mdx)$/, "") || ""
        );
      }
      return typedRow.metadata?.[col] ?? "";
    },
    renderCell: (params: GridRenderCellParams) => {
      const row = params.row as Row;
      // Check if this is the summary row
      if ((row as any).id === "__summary__") {
        const summary = summaries?.[col];
        if (!summary || summary.value === null || summary.value === undefined) {
          return null;
        }
        return (
          <Typography
            component="span"
            sx={{
              fontSize: "0.875rem",
              color: "text.primary",
            }}
          >
            {summary.function}: {formatSummaryValue(summary.value)}
          </Typography>
        );
      }
      return getCellValue(row, col);
    },
  }));

  // Transform rows into DataGrid format with unique IDs
  const gridRows = rows.map((row, index) => ({
    id: `${row.path}-${index}`,
    ...row,
  }));

  // Add summary row if summaries exist
  if (summaries && Object.keys(summaries).length > 0) {
    gridRows.push({
      id: "__summary__",
      path: "",
      appPath: "",
      metadata: {},
    } as any);
  }

  return (
    <Box
      className="not-prose"
      sx={{
        my: 3,
        width: "100%",
      }}
    >
      <DataGrid
        rows={gridRows}
        columns={gridColumns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10, page: 0 },
          },
        }}
        getRowHeight={() => "auto"}
        pageSizeOptions={[5, 10, 25, 50]}
        disableRowSelectionOnClick
        getRowClassName={(params) =>
          params.id === "__summary__" ? "summary-row" : ""
        }
        sx={{
          border: 1,
          borderColor: "divider",
          "& .MuiDataGrid-cell": {
            fontSize: "0.875rem",
          },
          "& .MuiDataGrid-columnHeaders": {
            fontWeight: 600,
            textTransform: "uppercase",
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
            bgcolor: "background.default",
          },
          "&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell": { py: "8px" },
          "&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell": {
            py: "15px",
          },
          "&.MuiDataGrid-root--densityComfortable .MuiDataGrid-cell": {
            py: "22px",
          },
          "& .summary-row": {
            bgcolor: "action.hover",
            borderColor: "divider",
          },
        }}
      />
    </Box>
  );
};
