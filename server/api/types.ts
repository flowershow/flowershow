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
  }>;
  avatar?: string;
  syntaxMode?: "md" | "mdx";
  [key: string]: any;
}
