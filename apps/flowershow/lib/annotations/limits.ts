/**
 * Client-side copy of ANNOTATION_LIMITS (packages/api-contract/src/schemas.ts).
 * Browser code must not import @flowershow/api-contract at runtime: its root
 * entry pulls in zod, zod-to-openapi and every route registration, and cannot
 * be tree-shaken. limits.test.ts keeps these equal to the contract.
 */
export const ANNOTATION_LIMITS = {
  quote: 1000,
  note: 2000,
  name: 60,
  context: 64,
  perPage: 500,
  perSite: 2000,
  bodyBytes: 16384,
} as const;
