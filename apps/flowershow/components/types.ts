import { GiscusProps } from '@giscus/react';

export interface NavLink {
  name: string;
  href: string;
}

export interface SocialLink extends NavLink {
  label?: SocialPlatform;
}

export type SocialPlatform =
  | 'bsky'
  | 'bluesky'
  | 'discord'
  | 'mail'
  | 'facebook'
  | 'github'
  | 'instagram'
  | 'linkedin'
  | 'mastodon'
  | 'pinterest'
  | 'reddit'
  | 'spotify'
  | 'substack'
  | 'telegram'
  | 'threads'
  | 'tiktok'
  | 'twitter'
  | 'whatsapp'
  | 'x'
  | 'youtube';

export interface NavConfig {
  logo?: string;
  title?: string;
  links?: NavLink[];
  social?: SocialLink[]; // DEPRECATED, moved to the root of the config as it's used in both navbar and footer
  cta?: NavLink;
}

export interface FooterNavigationGroup {
  title: string;
  links: NavLink[];
}

export interface FooterConfig {
  navigation?: FooterNavigationGroup[];
}

export interface SiteConfig {
  title?: string;
  description?: string;
  image?: string;
  logo?: string;
  favicon?: string;
  nav?: NavConfig;
  footer?: FooterConfig;
  social?: SocialLink[];
  analytics?: string;
  contentInclude?: string[];
  contentExclude?: string[];
  showSidebar?: boolean;
  sidebar?: {
    orderBy?: 'title' | 'path';
  };
  showToc?: boolean;
  showHero?: boolean;
  hero?:
    | boolean
    | {
        title?: string;
        description?: string;
        image?: string;
        cta?: Array<{
          href: string;
          label: string;
        }>;
        imagelayout?: 'right' | 'full';
      };
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
  theme?: string; // name of the official theme to use
  defaultMode?: 'light' | 'dark' | 'system';
  showModeSwitch?: boolean;
}

export interface SiteAlias {
  origin: string;
  alias: string;
}

export interface DashboardLink extends NavLink {
  type: 'guide' | 'discord' | 'announcement' | 'demo';
}

export interface AppNavConfig extends NavConfig {
  cta?: NavLink;
}

export interface AppConfig extends SiteConfig {
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
  footer?: FooterConfig;
  social?: SocialLink[];
}
