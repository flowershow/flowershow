import { NavLink } from "./home/nav";

interface AuthorConfig {
  name: string;
  url: string;
  logo: string;
}

export interface SiteConfig {
  title?: string;
  logo?: any;
  description?: string;
  author?: AuthorConfig;
  navLinks?: NavLink[];
}
