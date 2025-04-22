import { env } from "@/env.mjs";
import { Site, Plan } from "@prisma/client";
import { getConfig } from "./app-config";

const config = getConfig();

export enum Feature {
  DataRequest = "DataRequest",
  DataVisComponents = "DataVisComponents",
  CustomDomain = "CustomDomain",
  NoBranding = "NoBranding",
  Search = "Search",
  // AutoSync = "AutoSync",
  // Comments = "Comments",
  // Analytics = "Analytics",
}

// Define which features are available for each plan
const PREMIUM_FEATURES: Feature[] = [
  Feature.CustomDomain,
  Feature.NoBranding,
  Feature.Search,
  // Feature.AutoSync,
  // Feature.Comments,
  // Feature.Analytics,
];

/**
 * Check if a feature is enabled for a site
 */
export function isFeatureEnabled(feature: Feature, site: Site): boolean {
  switch (feature) {
    case Feature.DataRequest:
      return (
        env.NEXT_PUBLIC_ROOT_DOMAIN === "datahub.io" &&
        (site?.gh_repository.startsWith("datasets/") ||
          site?.gh_repository === "datopian/postal-codes")
      );
    case Feature.DataVisComponents:
      return config.dataVisComponentsEnabled ?? false;
    case Feature.NoBranding:
      return site.customDomain === "flowershow.app"
        ? false
        : site.plan === Plan.PREMIUM;
  }

  if (PREMIUM_FEATURES.includes(feature)) {
    return site.plan === Plan.PREMIUM;
  }
  return false;
}

/**
 * Type guard to check if a string is a valid Feature
 */
export function isValidFeature(feature: string): feature is Feature {
  return Object.values(Feature).includes(feature as Feature);
}
