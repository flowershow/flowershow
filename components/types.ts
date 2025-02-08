export interface SiteConfig {
  title?: string;
  description?: string;
  logo?: string;
  nav?: {
    logo?: string;
    title?: string;
    links?: NavLink[];
    social?: SocialLink[];
    cta?: NavLink;
  };
  analytics?: string;
  // content management
  contentInclude?: string[];
  contentExclude?: string[];
  // feature toggles
  showSidebar?: boolean;
  showToc?: boolean;
  showEditLink?: boolean;
}

export interface NavLink {
  name: string;
  href: string;
}

export interface SocialLink extends NavLink {
  label: SocialPlatform;
}

export type SocialPlatform =
  | "github"
  | "discord"
  | "linkedin"
  | "twitter"
  | "x"
  | "facebook"
  | "instagram"
  | "youtube";
