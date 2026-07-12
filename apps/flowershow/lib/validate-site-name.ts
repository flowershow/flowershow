/**
 * Single source of truth for validating a raw Site Name.
 *
 * A Site Name is stored raw and matched exactly/case-sensitively — it is the
 * lookup key (see ADR-0011). It is NEVER slugified. The only job of validation
 * is to guarantee the name can produce a derivable, non-empty, URL-safe
 * Subdomain and a valid path segment:
 *
 *  - non-empty after trimming
 *  - at most SITE_NAME_MAX_LENGTH characters
 *  - at least one ASCII alphanumeric character — this is what guarantees
 *    `sanitizeSubdomain` can never collapse to the empty string (#1307)
 *  - no `/` (would break the `/api/sites/{username}/{projectname}` path)
 *  - no ASCII control characters
 *
 * Used by every create/rename path (tRPC create, REST create, dashboard
 * rename) so the rule cannot drift between them.
 */

/** Maximum length of a Site Name, shared across create/rename/UI. */
export const SITE_NAME_MAX_LENGTH = 100;

export type SiteNameValidation =
  | { ok: true; name: string }
  | { ok: false; error: string };

function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function validateSiteName(raw: string): SiteNameValidation {
  const name = raw.trim();

  if (name.length < 1) {
    return { ok: false, error: 'Site name cannot be empty.' };
  }
  if (name.length > SITE_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Site name must be at most ${SITE_NAME_MAX_LENGTH} characters.`,
    };
  }
  if (!/[a-z0-9]/i.test(name)) {
    return {
      ok: false,
      error: 'Site name must contain at least one letter or number.',
    };
  }
  if (name.includes('/')) {
    return { ok: false, error: 'Site name cannot contain "/".' };
  }
  if (hasControlChar(name)) {
    return { ok: false, error: 'Site name cannot contain control characters.' };
  }

  return { ok: true, name };
}
