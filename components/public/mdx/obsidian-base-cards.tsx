'use client';

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import React from 'react';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import { resolveWikiLinkToFilePath } from '@/lib/resolve-wiki-link';
import { getWikiLinkValue, isWikiLink } from '@/lib/wiki-link';

type Row = {
  path: string;
  appPath: string;
  metadata: Record<string, any>;
};

export interface ObsidianBaseCardsProps {
  cardSize?: number;
  image?: string;
  imageFit?: 'contain' | 'cover';
  imageAspectRatio?: number;
  rows: string;
  sitePrefix?: string;
  customDomain?: string;
  order?: string[];
  allSitePaths?: string;
  properties?: string;
}

export const ObsidianBaseCards: React.FC<ObsidianBaseCardsProps> = (props) => {
  const rows = JSON.parse(props.rows) as Row[];
  const sitePrefix = props.sitePrefix;
  const customDomain = props.customDomain;
  const cardSize = props.cardSize || 200;
  const imageField = props.image;
  const imageFit = props.imageFit || 'contain';
  const imageAspectRatio = props.imageAspectRatio || 1;
  const order = props.order || ['file.name'];
  const allSitePaths = props.allSitePaths
    ? (JSON.parse(props.allSitePaths) as string[])
    : [];
  const properties = props.properties
    ? (JSON.parse(props.properties) as Record<
        string,
        { displayName?: string; [key: string]: any }
      >)
    : undefined;

  if (rows.length === 0) {
    return (
      <Box
        sx={{
          my: 2,
          p: 2,
          textAlign: 'center',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.default',
        }}
      >
        <Typography color="text.secondary">No results found</Typography>
      </Box>
    );
  }

  const getFieldValue = (row: Row, field: string): any => {
    if (field === 'file.name') {
      const pathParts = row.path.split('/');
      return pathParts[pathParts.length - 1]?.replace(/\.(md|mdx)$/, '') || '';
    }
    // Check if this is a formula property
    if (field.startsWith('formula.')) {
      const formulaName = field.substring(8); // Remove "formula." prefix
      return row.metadata?.__formulas?.[formulaName];
    }
    return row.metadata?.[field];
  };

  const getDisplayName = (field: string) => {
    // Check if there's a custom displayName in properties
    if (properties) {
      // Try exact match first (e.g., "formula.reading_time")
      if (properties[field]?.displayName) {
        return properties[field].displayName;
      }

      // Try with note. prefix (e.g., "note.author" for "author")
      if (properties[`note.${field}`]?.displayName) {
        return properties[`note.${field}`]!.displayName;
      }
    }

    // Handle formula properties
    if (field.startsWith('formula.')) {
      return field.substring(8);
    }
    return field;
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
            fontSize: '1rem',
          }}
        >
          {value}
        </Typography>
      );
    }

    // Handle wiki links - render as clickable links
    let displayValue: React.ReactNode;
    if (isWikiLink(value)) {
      const target = getWikiLinkValue(value);
      const filePath = resolveWikiLinkToFilePath({
        wikiLink: value,
        filePaths: allSitePaths,
      });
      const urlPath = resolveFilePathToUrlPath({
        target: filePath,
        sitePrefix,
        domain: customDomain,
      });

      displayValue = (
        <Link
          href={urlPath}
          style={{
            color: '#1976d2',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          {target}
        </Link>
      );
    } else {
      displayValue = String(value);
    }

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
    const fieldName = imageField.split('.').pop() || imageField;
    const imageValue = row.metadata?.[fieldName];

    if (!imageValue) return null;

    // Check if it's a wiki link
    if (typeof imageValue === 'string' && isWikiLink(imageValue)) {
      const filePath = resolveWikiLinkToFilePath({
        wikiLink: imageValue,
        filePaths: allSitePaths,
      });
      return resolveFilePathToUrlPath({
        target: filePath,
        sitePrefix,
        domain: customDomain,
      });
    }

    // If it's already a full URL, return it
    if (
      typeof imageValue === 'string' &&
      (imageValue.startsWith('http://') || imageValue.startsWith('https://'))
    ) {
      return imageValue;
    }

    return imageValue;
  };

  return (
    <Box className="not-prose" sx={{ my: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${cardSize}px, 1fr))`,
          gap: 2,
        }}
      >
        {rows.map((row, index) => {
          const linkUrl = `${sitePrefix}/${row.appPath || ''}`;
          const image = getImage(row);
          const isHexColor = image?.startsWith('#') && image.length === 7;

          return (
            <Card
              key={`${row.path}-${index}`}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'none',
                border: '1px solid #ebebeb',
              }}
            >
              <CardActionArea
                component={Link}
                href={linkUrl}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  flexGrow: 1,
                }}
              >
                {image && (
                  <CardMedia
                    component={isHexColor ? 'div' : 'img'}
                    image={!isHexColor ? image : undefined}
                    alt={
                      !isHexColor ? getFieldValue(row, 'file.name') : undefined
                    }
                    sx={{
                      width: '100%',
                      aspectRatio: `1 / ${imageAspectRatio}`,
                      objectFit: imageFit,
                      bgcolor: isHexColor ? image : 'grey.100',
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
