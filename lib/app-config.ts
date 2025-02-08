import { AppConfig, DashboardLink, SocialLink } from "@/components/types";
import config from "../config.json";

// Type assert the dashboard links to ensure they match the expected type
const typedDashboardLinks = config.dashboardSidebar?.links.map((link) => ({
  ...link,
  type: link.type as DashboardLink["type"],
  href: link.href ?? "",
}));

// Type assert social links
const typedSocialLinks =
  config.nav?.social?.map((social) => ({
    ...social,
    label: social.label as SocialLink["label"],
  })) ?? [];

// Construct the fully typed config
const typedConfig: AppConfig = {
  ...config,
  nav: {
    ...(config.nav || {}),
    social: typedSocialLinks,
  },
  dashboardSidebar: {
    links: typedDashboardLinks,
  },
};

export const getConfig = (): AppConfig => {
  return typedConfig;
};

// Default export for convenience
export default getConfig();
