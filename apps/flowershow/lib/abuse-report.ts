import { z } from 'zod';
import { env } from '@/env.mjs';
import { normalizeHost } from './site-host';

/** Where abuse reports go (the support inbox). */
export const ABUSE_REPORT_TO = 'support@flowershow.app';

/** Reports per IP per hour (in-memory, per instance: a brake, not a wall). */
export const ABUSE_REPORT_LIMIT_PER_HOUR = 5;

export const ABUSE_REASONS = [
  'phishing',
  'malware',
  'spam',
  'illegal',
  'other',
] as const;

export const abuseReportSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  reason: z.enum(ABUSE_REASONS),
  details: z.string().trim().max(5000).optional().default(''),
  email: z
    .union([z.literal(''), z.string().trim().email().max(320)])
    .optional()
    .default(''),
});

export type AbuseReportInput = z.infer<typeof abuseReportSchema>;

/**
 * Where to find the reported site: a `<subdomain>.<site domain>` host or a
 * custom domain. Accepts a full URL or a bare host. Null when unparseable or
 * the host is the bare site domain.
 */
export function reportedSiteLookup(
  rawUrl: string,
): { subdomain: string } | { customDomain: string } | null {
  let host: string;
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    host = normalizeHost(new URL(withScheme).hostname);
  } catch {
    return null;
  }
  if (!host) return null;
  const siteDomain = normalizeHost(env.NEXT_PUBLIC_SITE_DOMAIN);
  if (host === siteDomain) return null;
  if (host.endsWith(`.${siteDomain}`)) {
    const subdomain = host.slice(0, -(siteDomain.length + 1));
    return subdomain ? { subdomain } : null;
  }
  return { customDomain: host };
}
