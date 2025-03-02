import { DataPackage } from "@/components/layouts/datapackage-types";

interface PageMetadataBase {
  _url: string; // url at which the file is available on the site
  _path: string; // path to the file in the repository
  _pagetype: "wiki" | "blog" | "dataset";
  title?: string;
  description?: string;
  publish: boolean;
}

export interface WikiPageMetadata extends PageMetadataBase {
  _pagetype: "wiki";
  image?: string;
}

export interface BlogPageMetadata extends PageMetadataBase {
  _pagetype: "blog";
  authors?: string[];
  image?: string;
  date?: string;
  modified?: string;
}

export interface DatasetPageMetadata extends PageMetadataBase, DataPackage {
  _pagetype: "dataset";
  title: string;
  description: string;
}

export type PageMetadata =
  | WikiPageMetadata
  | BlogPageMetadata
  | DatasetPageMetadata;

export const isDatasetPage = (
  pageMetadata: PageMetadata,
): pageMetadata is DatasetPageMetadata => {
  return pageMetadata._pagetype === "dataset";
};

export enum OrganizationType {
  "Business" = "Business",
  "Charity / NGO" = "Charity / NGO",
  "Academic / Teacher / Researcher" = "Academic / Teacher / Researcher",
  "Individual" = "Individual",
  "Student" = "Student",
}
