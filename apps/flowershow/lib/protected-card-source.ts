import type { Plan } from '@prisma/client';
import type { SiteConfig } from '@/components/types';
import prisma from '@/server/db';

/**
 * Card inputs for a PASSWORD site, read straight from the DB exactly as the
 * /_og route does. `site.plan` from the tRPC lookup is withheld without access,
 * so it must come from here or `v` would differ for PREMIUM sites.
 */
export async function loadProtectedCardSource(siteId: string): Promise<{
  plan: Plan | null;
  dbConfig: SiteConfig | null;
}> {
  const row = await prisma.site.findUnique({
    where: { id: siteId },
    select: { configJson: true, plan: true },
  });
  return {
    plan: row?.plan ?? null,
    dbConfig: (row?.configJson ?? null) as SiteConfig | null,
  };
}
