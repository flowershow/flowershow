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
 * Error thrown when a raw project name contains no characters that survive
 * subdomain sanitization (e.g. a name made entirely of hyphens, spaces, or
 * symbols). Such a name has no valid DNS label of its own.
 *
 * Callers that turn user input into a site should catch this and reject the
 * request (400 / BAD_REQUEST) rather than letting the site be created.
 */
export class EmptySubdomainLabelError extends Error {
  constructor(raw: string) {
    super(`Project name "${raw}" produces no valid subdomain label`);
    this.name = 'EmptySubdomainLabelError';
  }
}

/**
 * Build the subdomain for a regular user site.
 * Format: {projectName}-{username}
 *
 * The project and username labels are sanitized *independently* and then
 * joined, so the separating hyphen can never be collapsed into an adjacent run
 * of hyphens. Without this, a projectName of only hyphens (e.g. "---") would
 * sanitize away entirely and leave the bare `{username}` — letting a user
 * squat on `<username>.flowershow.me` and bypass the `{sitename}-{username}`
 * format. An empty project label is rejected outright.
 *
 * @throws EmptySubdomainLabelError if `projectName` has no valid label.
 */
export function buildSiteSubdomain(
  projectName: string,
  username: string,
): string {
  const projectLabel = sanitizeSubdomain(projectName);
  if (!projectLabel) {
    throw new EmptySubdomainLabelError(projectName);
  }
  return sanitizeSubdomain(`${projectLabel}-${username}`);
}

/**
 * Build the subdomain for an anonymous/temporary site.
 * Format: {projectName}-anon
 *
 * @throws EmptySubdomainLabelError if `projectName` has no valid label.
 */
export function buildAnonSiteSubdomain(projectName: string): string {
  const projectLabel = sanitizeSubdomain(projectName);
  if (!projectLabel) {
    throw new EmptySubdomainLabelError(projectName);
  }
  return sanitizeSubdomain(`${projectLabel}-anon`);
}
