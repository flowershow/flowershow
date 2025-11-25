"use client";

import React from "react";
import Link from "next/link";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import { getWikiLinkValue, isWikiLink } from "@/lib/wiki-link";
import { resolveWikiLinkToFilePath } from "@/lib/resolve-wiki-link";
import { resolveFilePathToUrlPath } from "@/lib/resolve-link";

type Row = {
  path: string;
  appPath: string;
  metadata: Record<string, any>;
};

export interface ObsidianBaseCardsProps {
  cardSize?: number;
  image?: string;
  imageFit?: "contain" | "cover";
  imageAspectRatio?: number;
  rows: string;
  sitePrefix?: string;
  order?: string[];
  allSitePaths?: string;
}

export const ObsidianBaseCards: React.FC<ObsidianBaseCardsProps> = (props) => {
  const rows = JSON.parse(props.rows) as Row[];
  const sitePrefix = props.sitePrefix;
  const cardSize = props.cardSize || 200;
  const imageField = props.image;
  const imageFit = props.imageFit || "cover";
  const imageAspectRatio = props.imageAspectRatio || 1;
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

  const getDisplayName = (field: string) => {
    if (field === "file.name") return "Name";
    return field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ");
  };

  const renderFieldValue = (
    row: Row,
    field: string,
    fieldIndex: number,
  ): React.ReactNode => {
    const value = getFieldValue(row, field);

    if (value === null || value === undefined) {
      return null;
    }

    // First field (usually file.name) is the title
    if (fieldIndex === 0) {
      return (
        <Typography
          key={field}
          variant="h6"
          component="div"
          sx={{
            mb: 1,
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          {value}
        </Typography>
      );
    }

    // For wiki links in card view, display as plain text (extract the link text)
    const displayValue = isWikiLink(value)
      ? getWikiLinkValue(value)
      : String(value);

    // Other fields are displayed as metadata
    return (
      <Box key={field}>
        <Typography
          variant="body2"
          component="span"
          sx={{ fontWeight: 500, mr: 0.5 }}
        >
          {getDisplayName(field)}:
        </Typography>
        <Typography variant="body2" component="span" color="text.secondary">
          {displayValue}
        </Typography>
      </Box>
    );
  };

  const getImage = (row: Row): string | null => {
    if (!imageField) return null;

    // Extract the field name from patterns like "note.image"
    const fieldName = imageField.split(".").pop() || imageField;
    const imageValue = row.metadata?.[fieldName];

    if (!imageValue) return null;

    // Check if it's a wiki link
    if (typeof imageValue === "string" && isWikiLink(imageValue)) {
      const filePath = resolveWikiLinkToFilePath({
        wikiLink: imageValue,
        filePaths: allSitePaths,
      });
      return resolveFilePathToUrlPath({ target: filePath, sitePrefix });
    }

    // If it's already a full URL, return it
    if (
      typeof imageValue === "string" &&
      (imageValue.startsWith("http://") || imageValue.startsWith("https://"))
    ) {
      return imageValue;
    }

    return imageValue;
  };

  return (
    <Box className="not-prose" sx={{ my: 3 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${cardSize}px, 1fr))`,
          gap: 2,
        }}
      >
        {rows.map((row, index) => {
          const linkUrl = `${sitePrefix}/${row.appPath || ""}`;
          const image = getImage(row);
          const isHexColor = image?.startsWith("#") && image.length === 7;

          return (
            <Card
              key={`${row.path}-${index}`}
              sx={{
                display: "flex",
                flexDirection: "column",
                boxShadow: "none",
                border: "1px solid #ebebeb",
              }}
            >
              <CardActionArea
                component={Link}
                href={linkUrl}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  flexGrow: 1,
                }}
              >
                {image && (
                  <CardMedia
                    component={isHexColor ? "div" : "img"}
                    image={!isHexColor ? image : undefined}
                    alt={
                      !isHexColor ? getFieldValue(row, "file.name") : undefined
                    }
                    sx={{
                      width: "100%",
                      aspectRatio: `1 / ${imageAspectRatio}`,
                      objectFit: imageFit,
                      bgcolor: isHexColor ? image : "grey.100",
                    }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  {order.map((field, fieldIndex) =>
                    renderFieldValue(row, field, fieldIndex),
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};
