import { Plan } from '@prisma/client';

export const MB = 1_048_576;
export const GB = 1_073_741_824;

export type PlanLimits = {
  siteSoftBytes: number;
  siteHardBytes: number;
  freePoolHardBytes: number | null;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    siteSoftBytes: 100 * MB,
    siteHardBytes: 200 * MB,
    freePoolHardBytes: 1 * GB,
  },
  PREMIUM: {
    siteSoftBytes: 5 * GB,
    siteHardBytes: 10 * GB,
    freePoolHardBytes: null,
  },
};

export enum Feature {
  CustomDomain = 'CustomDomain',
  NoBranding = 'NoBranding',
  Search = 'Search',
  PasswordProtection = 'PasswordProtection',
  CustomHead = 'CustomHead',
  PageScripts = 'PageScripts',
  CustomFooter = 'CustomFooter',
  CustomNavbar = 'CustomNavbar',
  // AutoSync = "AutoSync",
  // Comments = "Comments",
  // Analytics = "Analytics",
}

// Define which features are available for each plan
const PREMIUM_FEATURES: Feature[] = [
  Feature.CustomDomain,
  Feature.NoBranding,
  Feature.Search,
  Feature.PasswordProtection,
  Feature.CustomHead,
  Feature.PageScripts,
  Feature.CustomFooter,
  Feature.CustomNavbar,
  // Feature.AutoSync,
  // Feature.Comments,
  // Feature.Analytics,
];

export type Entitlements = {
  plan: Plan;
  isPaid: boolean;
  features: ReadonlySet<Feature>;
  limits: PlanLimits;
};

/**
 * Resolve what a site is entitled to. Pure, no DB access.
 */
export function getEntitlements(site: { plan?: Plan | null }): Entitlements {
  const plan: Plan = site.plan === Plan.PREMIUM ? Plan.PREMIUM : Plan.FREE;
  const isPaid = plan === Plan.PREMIUM;
  return {
    plan,
    isPaid,
    features: new Set(isPaid ? PREMIUM_FEATURES : []),
    limits: PLAN_LIMITS[plan],
  };
}
