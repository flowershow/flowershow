import prisma from '@/server/db';

/**
 * Turn an email address into a subdomain-safe username slug.
 *
 * Usernames are used in default site subdomains
 * (`<sitename>-<username>.flowershow.me`), so the result must only contain
 * lowercase letters and digits. We transliterate accented Latin characters to
 * ASCII (`józef` → `jozef`), lowercase, and strip every remaining character
 * that isn't a letter or digit (so `john.doe`, `john+tag` and `john doe` all
 * collapse to a single token). Falls back to `user` when nothing usable is
 * left. The collision suffix in `generateUsername` is the only source of
 * hyphens in a generated username.
 */
export function slugifyUsername(email: string): string {
  const local = email.split('@')[0] ?? '';
  const slug = local
    .normalize('NFKD') // decompose accents: é → e + combining mark
    .replace(/[\u0300-\u036f]/g, '') // strip the combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // strip everything that isn't a letter or digit
  return slug || 'user';
}

/**
 * Produce a unique, subdomain-safe username derived from an email address.
 *
 * Starts from the sanitised slug and appends an incrementing numeric suffix
 * (`slug-2`, `slug-3`, …) until an unused username is found. Used for sign-in
 * methods that have no OAuth profile to derive a username from (magic link),
 * and for Google sign-ups (whose raw email prefix was neither sanitised nor
 * collision-checked).
 */
export async function generateUsername(email: string): Promise<string> {
  const base = slugifyUsername(email);
  let candidate = base;
  let suffix = 1;

  while (
    await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}
