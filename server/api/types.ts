import { DataPackage } from "@/components/layouts/datapackage-types";

interface PageMetadataBase {
  layout: "wiki" | "blog" | "dataset" | "plain";
  title?: string;
  description?: string;
  image?: string;
  authors?: string[];
  date?: string;
  publish: boolean;
  showSidebar?: boolean;
  showToc?: boolean;
  showHero?: boolean;
  showEditLink?: boolean;
  showComments?: boolean;
  cta?: Array<{
    href: string;
    label: string;
  }>; // CTAs used if hero is enabled (only 2 supported)
}

export interface PlainPageMetadata extends PageMetadataBase {
  layout: "plain";
}

export interface WikiPageMetadata extends PageMetadataBase {
  layout: "wiki";
}

export interface BlogPageMetadata extends PageMetadataBase {
  layout: "blog";
}

export interface DatasetPageMetadata extends PageMetadataBase, DataPackage {
  layout: "dataset";
  title: string;
  description: string;
}

export type PageMetadata =
  | WikiPageMetadata
  | BlogPageMetadata
  | DatasetPageMetadata
  | PlainPageMetadata;

export const isDatasetPage = (
  pageMetadata: PageMetadata,
): pageMetadata is DatasetPageMetadata => {
  return pageMetadata.layout === "dataset";
};

export enum OrganizationType {
  "Business" = "Business",
  "Charity / NGO" = "Charity / NGO",
  "Academic / Teacher / Researcher" = "Academic / Teacher / Researcher",
  "Individual" = "Individual",
  "Student" = "Student",
}
