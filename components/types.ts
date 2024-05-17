/* --------------
 * User site config
 * --------------
 */
export interface SiteConfig {
  title?: string;
  description?: string;
  logo?: string;
  navbarTitle?: NavbarTitleConfig;
  author?: AuthorConfig;
  navLinks?: NavLink[];
  showSidebar?: boolean;
  // custom domain only (future paid feature potentially)
  social: SocialLink[];
  footerLinks?: FooterLink[];
}

/* --------------
 * DataHub Cloud site's config
 * --------------
 */
export interface ExtendedSiteConfig extends SiteConfigStrict {
  github: string; // TODO is this needed?
  discord: string; // TODO is this needed?
  analytics: string;
}

type SiteConfigStrict = WithRequired<
  SiteConfig,
  "title" | "description" | "logo" | "navbarTitle" | "author" | "navLinks"
>;

/* --------------
 * Config types
 * --------------
 */
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

export type SocialPlatform = "github" | "discord" | "linkedin" | "twitter";

export interface SocialLink {
  label: SocialPlatform;
  href: string;
}

type WithRequired<T, K extends keyof T> = Required<Pick<T, K>> &
  Partial<Omit<T, K>>;
