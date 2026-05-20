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

export interface NavDropdown {
  name: string;
  links: NavLink[];
}

export type NavItem = NavLink | NavDropdown;

export function isNavDropdown(item: NavItem): item is NavDropdown {
  return 'links' in item && !('href' in item);
}

export interface NavConfig {
  /** @deprecated Use root `logo` in SiteConfig instead */
  logo?: string;
  title?: string;
  links?: NavItem[];
  /** @deprecated Use root `social` in SiteConfig instead */
  social?: SocialLink[];
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
  umami?: string | { websiteId: string; src?: string };
  contentInclude?: string[];
  contentExclude?: string[];
  contentHide?: string[];
  showSidebar?: boolean;
  sidebar?: {
    orderBy?: 'title' | 'path';
    paths?: string[];
  };
  showToc?: boolean;
  showEditLink?: boolean;
  showComments?: boolean;
  giscus?: Partial<GiscusProps>;
  redirects?: Array<{
    from: string;
    to: string;
    permanent?: boolean;
  }>;
  theme?: string | ThemeConfig;
  enableSearch?: boolean;
  enableRss?: boolean;
  showBuiltWithButton?: boolean;
  showRawLink?: boolean;
  syntaxMode?: 'auto' | 'md' | 'mdx';

  // Not configurable via dashboard — set in config.json only
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
  cta?: Array<{
    href: string;
    label: string;
  }>;
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
