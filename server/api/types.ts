import { DataPackage } from "@/components/layouts/datapackage-types";

interface PageMetadataBase {
  _url: string; // url at which the file is available on the site
  _path: string; // path to the file in the repository
  _pagetype: "dataset" | "story";
  _rawUrlBase: string; // temporary solution to resolve relative paths in data visualization components client side
  // _tags: string[];
  // _tasks: string[];
}

export interface DatasetPageMetadata extends PageMetadataBase, DataPackage {
  _pagetype: "dataset";
  title: string;
  description: string;
}

export interface StoryPageMetadata extends PageMetadataBase {
  _pagetype: "story";
  title: string;
  description: string;
  date?: string;
  authors?: string[];
}

export type PageMetadata = DatasetPageMetadata | StoryPageMetadata;

export const isDatasetPage = (
  pageMetadata: PageMetadata,
): pageMetadata is DatasetPageMetadata => {
  return pageMetadata._pagetype === "dataset";
};
