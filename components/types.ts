export interface SiteConfig {
  title?: string;
  description?: string;
  logo?: string;
  navbarTitle?: NavbarTitleConfig;
  author?: AuthorConfig;
  navLinks?: NavLink[];
  showSidebar?: boolean;
  showToc?: boolean;
  analytics?: string;
  social: SocialLink[];
  footerLinks?: FooterLink[];
  showEditLink?: boolean;
  contentInclude?: string[];
  contentExclude?: string[];
}

export interface NavbarTitleConfig {
  logo: string;
  text: string;
  // version?: string; // has no effect on the UI atm
}

export interface FooterLink {
  name: string;
  subItems: NavLink[];
}

export interface AuthorConfig {
  name: string;
  logo: string;
  url: string;
}

export interface NavLink {
  name: string;
  href: string;
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

export interface SocialLink {
  label: SocialPlatform;
  href: string;
}
