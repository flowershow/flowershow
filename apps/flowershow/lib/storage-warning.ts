import { createElement } from 'react';
import prisma from '@/server/db';
import type { StorageViolation } from './storage-limits';

/**
 * Master switch for the over-limit storage emails. Shipped off: turning it on
 * starts real email to users and needs Rufus's yes.
 */
export const STORAGE_EMAILS_LIVE = false;

/** At most one warning per site (or per account, for the Free pool) per 30 days. */
export const STORAGE_WARNING_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Send the gentle over-limit email, at most once per interval. Never blocks a
 * publish; callers wrap this in try/catch.
 *
 * The send is claimed first with a conditional update, so concurrent publishes
 * send once. A failed send is therefore not retried for 30 days, which is the
 * right trade for a courtesy email. `live` is the test seam.
 */
export async function sendStorageWarning(input: {
  site: {
    id: string;
    userId: string;
    plan: 'FREE' | 'PREMIUM' | string | null;
    projectName: string;
  };
  violation: StorageViolation;
  live?: boolean;
}): Promise<void> {
  const { site, violation, live = STORAGE_EMAILS_LIVE } = input;
  if (!live) return;

  // Loaded lazily: the email stack constructs a Resend client at import time,
  // which the (always-on) publish routes must not pay for while this is off.
  const [{ env }, { sendTransactionalEmail }, emailModule] = await Promise.all([
    import('@/env.mjs'),
    import('./transactional-email'),
    import('@/emails/storage-over-limit'),
  ]);
  const StorageOverLimitEmail = emailModule.default;
  const { storageOverLimitSubject } = emailModule;

  const now = new Date();
  const cutoff = new Date(now.getTime() - STORAGE_WARNING_INTERVAL_MS);

  const claim =
    violation.scope === 'pool'
      ? await prisma.user.updateMany({
          where: {
            id: site.userId,
            OR: [
              { storagePoolWarningSentAt: null },
              { storagePoolWarningSentAt: { lt: cutoff } },
            ],
          },
          data: { storagePoolWarningSentAt: now },
        })
      : await prisma.site.updateMany({
          where: {
            id: site.id,
            OR: [
              { storageWarningSentAt: null },
              { storageWarningSentAt: { lt: cutoff } },
            ],
          },
          data: { storageWarningSentAt: now },
        });
  if (claim.count !== 1) return;

  const owner = await prisma.user.findUnique({
    where: { id: site.userId },
    select: { email: true, name: true },
  });
  if (!owner?.email) return;

  const isPremium = site.plan === 'PREMIUM';
  const upgradeUrl = isPremium
    ? undefined
    : violation.scope === 'pool'
      ? `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`
      : `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}/site/${site.id}/settings#billing`;

  const scopeId = violation.scope === 'pool' ? site.userId : site.id;
  await sendTransactionalEmail({
    to: owner.email,
    subject: storageOverLimitSubject({
      scope: violation.scope,
      isPremium,
      siteName: site.projectName,
    }),
    react: createElement(StorageOverLimitEmail, {
      userName: owner.name ?? undefined,
      siteName: site.projectName,
      scope: violation.scope,
      isPremium,
      usedBytes: violation.projectedBytes,
      limitBytes: violation.limitBytes,
      upgradeUrl,
    }),
    type: 'storage_over_limit',
    userId: site.userId,
    idempotencyKey: `storage-over-limit:${violation.scope}:${scopeId}:${now.toISOString().slice(0, 10)}`,
    properties: { scope: violation.scope, site_id: site.id },
  });
}
