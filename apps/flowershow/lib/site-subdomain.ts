import { transliterate } from 'transliteration';

/**
 * Build a DNS-safe subdomain label from the given parts — typically the site
 * name plus an owner discriminator: a username, `"anon"` for temporary sites,
 * or a numeric suffix during collision resolution.
 *
 * Parts are joined with `-`, transliterated to ASCII (so non-Latin names like
 * "База знаний" yield a readable label instead of collapsing to hyphens),
 * lowercased, reduced to `[a-z0-9-]` with no repeated/leading/trailing hyphens,
 * and capped at the 63-char DNS label limit. The trailing discriminator is what
 * guarantees the label is non-empty even when the name transliterates to
 * nothing (#1307) — the site name itself is never required to be sluggable.
 */
export function buildSubdomain(...parts: string[]): string {
  return transliterate(parts.join('-'))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // replace invalid chars with hyphen
    .replace(/-+/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '') // strip leading/trailing hyphens
    .slice(0, 63) // enforce max label length
    .replace(/-+$/g, ''); // strip any trailing hyphen left by truncation
}

/**
 * Resolve a globally-unique subdomain by appending `-N` until `exists` reports
 * the candidate is free.
 */
export async function ensureUniqueSubdomain(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let subdomain = base;
  let n = 2;
  while (await exists(subdomain)) {
    // Re-build so the suffixed value stays a valid, length-bounded label.
    subdomain = buildSubdomain(base, String(n));
    n++;
  }
  return subdomain;
}
