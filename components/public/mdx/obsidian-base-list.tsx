"use client";

import React from "react";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { getWikiLinkValue, isWikiLink } from "@/lib/wiki-link";
import { resolveWikiLinkToFilePath } from "@/lib/resolve-wiki-link";
import { resolveFilePathToUrlPath } from "@/lib/resolve-link";

type Row = {
  path: string;
  appPath: string;
  metadata: Record<string, any>;
};

export interface ObsidianBaseListProps {
  rows: string;
  order?: string[];
  sitePrefix?: string;
  allSitePaths?: string;
}

export const ObsidianBaseList: React.FC<ObsidianBaseListProps> = (props) => {
  const rows = JSON.parse(props.rows) as Row[];
  const sitePrefix = props.sitePrefix;
  const order = props.order || ["file.name"];
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

  const getFieldValue = (row: Row, field: string): any => {
    if (field === "file.name") {
      const pathParts = row.path.split("/");
      return pathParts[pathParts.length - 1]?.replace(/\.(md|mdx)$/, "") || "";
    }
    return row.metadata?.[field];
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const renderFieldValue = (
    row: Row,
    field: string,
    fieldIndex: number,
  ): React.ReactNode => {
    const value = getFieldValue(row, field);

    // Handle file.name as a link
    if (field === "file.name") {
      const formattedValue = formatValue(value);
      if (formattedValue === "") {
        return null;
      }

      const linkUrl = resolveFilePathToUrlPath({
        target: row.path,
        sitePrefix,
      });

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
          {formattedValue}
        </Link>
      );
    }

    // Handle null/undefined values
    if (value === null || value === undefined) {
      return null;
    }

    // Handle wiki links
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

    // Handle regular values
    const formattedValue = formatValue(value);
    return formattedValue === "" ? null : formattedValue;
  };

  return (
    <Box className="not-prose" sx={{ my: 3 }}>
      <Box
        component="ul"
        sx={{
          listStyle: "disc",
          pl: 4,
          m: 0,
        }}
      >
        {rows.map((row, index) => {
          // Build array of property parts
          const propertyParts = order
            .map((field, fieldIndex) => {
              return renderFieldValue(row, field, fieldIndex);
            })
            .filter((part) => part !== null);

          return (
            <Box
              component="li"
              key={`${row.path}-${index}`}
              sx={{
                mb: 1,
                lineHeight: 1.6,
              }}
            >
              {propertyParts.map((part, partIndex) => (
                <React.Fragment key={partIndex}>
                  {partIndex > 0 && ", "}
                  {part}
                </React.Fragment>
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
