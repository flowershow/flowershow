import { GiscusProps } from "@giscus/react";

export interface NavLink {
  name: string;
  href: string;
}

export interface SocialLink extends NavLink {
  label?: SocialPlatform;
}

export type SocialPlatform =
  | "github"
  | "discord"
  | "linkedin"
  | "twitter"
  | "x"
  | "facebook"
  | "instagram"
  | "youtube"
  | "mastodon"
  | "bsky"
  | "bluesky"
  | "reddit";

export interface NavConfig {
  logo?: string;
  title?: string;
  links?: NavLink[];
  social?: SocialLink[];
  cta?: NavLink;
}

export interface SiteConfig {
  title?: string;
  description?: string;
  image?: string;
  logo?: string;
  favicon?: string;
  nav?: NavConfig;
  analytics?: string;
  contentInclude?: string[];
  contentExclude?: string[];
  showSidebar?: boolean;
  sidebar?: {
    orderBy?: "title" | "path";
  };
  showToc?: boolean;
  showHero?: boolean;
  showEditLink?: boolean;
  showComments?: boolean;
  giscus?: Partial<GiscusProps>;
  cta?: Array<{
    href: string;
    label: string;
  }>; // CTAs used if hero is enabled (only 2 supported)
  redirects?: Array<{
    from: string; // Exact path to match (e.g. "/old-page")
    to: string; // Path to redirect to (e.g. "/new-page")
    permanent?: boolean; // Whether to use 301 (true) or 302 (false) redirect
  }>;
  theme?: string | ThemeConfig;
}

export interface ThemeConfig {
  theme?: string; // name of the theme to use
  variant?: "light" | "dark" | "system"; // theme variant to use by default
  showVariantSwitch?: boolean; // show theme variant toggle
}

export interface SiteAlias {
  origin: string;
  alias: string;
}

export interface DashboardLink extends NavLink {
  type: "guide" | "discord" | "announcement" | "demo";
}

export interface AppNavConfig extends NavConfig {
  cta?: NavLink;
}

export interface AppConfig extends SiteConfig {
  product: "flowershow" | "datahub";
  logo: string;
  favicon: string;
  thumbnail: string;
  termsOfService: string;
  githubTemplateUrl: string;
  landingPageUrl: string;
  nav: AppNavConfig;
  dashboardSidebar: {
    links: DashboardLink[];
  };
  siteAliases?: SiteAlias[];
  dataVisComponentsEnabled?: boolean;
}
