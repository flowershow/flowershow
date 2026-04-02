/**
 * Sanitize a raw string into a valid DNS subdomain label.
 *
 * Rules applied:
 *  - Lowercase only
 *  - Only a-z, 0-9, hyphens
 *  - Consecutive hyphens collapsed to one
 *  - No leading or trailing hyphens
 *  - Max 63 characters (truncated cleanly, never ending with a hyphen)
 */
export function sanitizeSubdomain(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // replace invalid chars with hyphen
    .replace(/-+/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '') // strip leading/trailing hyphens
    .slice(0, 63) // enforce max label length
    .replace(/-+$/g, ''); // strip any trailing hyphen left by truncation
}

/**
 * Build the subdomain for a regular user site.
 * Format: {projectName}-{username}
 */
export function buildSiteSubdomain(
  projectName: string,
  username: string,
): string {
  return sanitizeSubdomain(`${projectName}-${username}`);
}

/**
 * Build the subdomain for an anonymous/temporary site.
 * Format: {projectName}-anon
 */
export function buildAnonSiteSubdomain(projectName: string): string {
  return sanitizeSubdomain(`${projectName}-anon`);
}
