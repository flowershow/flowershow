import 'server-only';
import { Prisma } from '@prisma/client';
import prisma from '@/server/db';

export const internalSiteSelect = Prisma.validator<Prisma.SiteSelect>()({
  id: true,
  ghRepository: true,
  ghBranch: true,
  projectName: true,
  customDomain: true,
  rootDir: true,
  plan: true,
  enableComments: true,
  giscusRepoId: true,
  giscusCategoryId: true,
  enableSearch: true,
  syntaxMode: true,
  privacyMode: true,
  autoSync: true,
  installationId: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { username: true } },
  // Internal only data
  accessPasswordHash: true,
  tokenVersion: true,
});

export type InternalSite = Prisma.SiteGetPayload<{
  select: typeof internalSiteSelect;
}>;

export async function internalGetSiteById(
  id: string,
): Promise<InternalSite | null> {
  return await prisma.site.findUnique({
    where: {
      id,
    },
    select: internalSiteSelect,
  });
}
