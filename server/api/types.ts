export interface PageMetadata {
  title: string;
  description?: string;
  layout?: "plain";
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
  // authors pages
  avatar?: string;
}

export enum OrganizationType {
  "Business" = "Business",
  "Charity / NGO" = "Charity / NGO",
  "Academic / Teacher / Researcher" = "Academic / Teacher / Researcher",
  "Individual" = "Individual",
  "Student" = "Student",
}
