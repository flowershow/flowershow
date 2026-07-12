/**
 * Sanitize a raw site name into the form stored as the `Site.projectName`
 * column.
 *
 * This MUST be applied both when creating a site and when looking one up by
 * name, otherwise a site created from e.g. "My Notes" (stored as "my-notes")
 * can never be found again by the raw name and publishing breaks with a
 * spurious "already exists" 409.
 *
 * Rules applied:
 *  - Lowercase only
 *  - Any character outside [a-z0-9-_] becomes a hyphen
 *
 * Note: unlike `sanitizeSubdomain`, this intentionally does NOT collapse
 * consecutive hyphens or strip leading/trailing hyphens — the transform must
 * stay byte-for-byte compatible with existing stored `projectName` values.
 */
export function sanitizeProjectName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
}
