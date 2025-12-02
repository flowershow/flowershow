import { env } from "@/env.mjs";

/**
 * Deterministically derive per-site key bytes using SHA-256 over
 * (root secret + site id + version). Works in Edge and Node.
 */
export async function siteKeyBytes(siteId: string, tokenVersion: number) {
  const enc = new TextEncoder();
  const material = enc.encode(
    `${env.SITE_ACCESS_JWT_SECRET}:${siteId}:${tokenVersion}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", material);
  return new Uint8Array(digest);
}
