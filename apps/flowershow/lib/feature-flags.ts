import { env } from '@/env.mjs';
import { Feature, getEntitlements } from '@/lib/entitlements';
import { FullSite } from '@/server/api/types';

export { Feature };

/**
 * Check if a feature is enabled for a site
 */
export function isFeatureEnabled(
  feature: Feature,
  site: Pick<FullSite, 'customDomain'> & { plan?: FullSite['plan'] | null },
): boolean {
  return getEntitlements(site).features.has(feature);
}

/**
 * Type guard to check if a string is a valid Feature
 */
export function isValidFeature(feature: string): feature is Feature {
  return Object.values(Feature).includes(feature as Feature);
}

/** Generated social cards (flowershow-1o5). Off unless SOCIAL_CARDS_ENABLED=true. */
export function isSocialCardsEnabled(): boolean {
  return env.SOCIAL_CARDS_ENABLED === 'true';
}
