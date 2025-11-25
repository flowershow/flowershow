"use client";

import React, { useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { ObsidianBaseTable } from "./obsidian-base-table";
import { ObsidianBaseCards } from "./obsidian-base-cards";
import { ObsidianBaseList } from "./obsidian-base-list";
import { BaseView } from "@/lib/remark-obsidian-bases";

type ViewData = {
  view: BaseView;
  columns: string[];
  rows: any[];
  summaries?: Record<
    string,
    { value: number | string | null; function: string }
  >;
};

export interface ObsidianBasesViewsProps {
  viewData: string; // JSON string of ViewData[]
  sitePrefix?: string;
  allSitePaths?: string; // JSON string of all blob paths for the site
}

export const ObsidianBasesViews: React.FC<ObsidianBasesViewsProps> = (
  props,
) => {
  const viewData = JSON.parse(props.viewData) as ViewData[];
  const sitePrefix = props.sitePrefix;

  // Determine available view types
  const availableViews = viewData.map((vd) => vd.view.type);
  const hasMultipleViews = availableViews.length > 1;

  // Set initial view to the first available view
  const [currentViewIndex, setCurrentViewIndex] = useState<number>(0);

  const handleViewChange = (event: SelectChangeEvent<number>) => {
    const newIndex = event.target.value as number;
    setCurrentViewIndex(newIndex);
  };

  const currentData = viewData[currentViewIndex];
  const currentView = currentData?.view;

  const renderView = () => {
    if (!currentData || !currentView) return null;

    const rows = JSON.stringify(currentData.rows);
    const columns = JSON.stringify(currentData.columns);
    const summaries = currentData.summaries
      ? JSON.stringify(currentData.summaries)
      : undefined;
    const allSitePathsStr = props.allSitePaths;

    if (currentView.type === "cards") {
      return (
        <ObsidianBaseCards
          rows={rows}
          sitePrefix={sitePrefix}
          allSitePaths={allSitePathsStr}
          cardSize={currentView.cardSize}
          image={currentView.image}
          imageFit={currentView.imageFit}
          imageAspectRatio={currentView.imageAspectRatio}
          order={currentView.order}
        />
      );
    }

    if (currentView.type === "list") {
      return (
        <ObsidianBaseList
          rows={rows}
          sitePrefix={sitePrefix}
          allSitePaths={allSitePathsStr}
          order={currentView.order}
        />
      );
    }

    // Default to table view
    return (
      <ObsidianBaseTable
        columns={columns}
        rows={rows}
        sitePrefix={sitePrefix}
        allSitePaths={allSitePathsStr}
        summaries={summaries}
      />
    );
  };

  return (
    <Box sx={{ my: 2 }}>
      {hasMultipleViews && (
        <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="view-select-label">View</InputLabel>
            <Select
              labelId="view-select-label"
              id="view-select"
              value={currentViewIndex}
              label="View"
              onChange={handleViewChange}
            >
              {viewData.map((vd, index) => (
                <MenuItem key={index} value={index}>
                  {vd.view.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      {renderView()}
    </Box>
  );
};
