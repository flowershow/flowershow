import type { AnnotationsBulkRequest } from '@flowershow/api-contract';
import type { PrismaClient } from '@prisma/client';
import { normalizeAnnotationPath } from './dto';

/** Owner-only resolve / reopen / delete, scoped to one site. Shared by the REST bulk route and tRPC. */
export async function applyAnnotationsBulk(
  db: Pick<PrismaClient, 'annotation'>,
  siteId: string,
  {
    action,
    ids,
    path,
  }: Pick<AnnotationsBulkRequest, 'action' | 'ids' | 'path'>,
): Promise<number> {
  const where = {
    siteId,
    ...(ids ? { id: { in: ids } } : {}),
    ...(path ? { path: normalizeAnnotationPath(path) } : {}),
  };
  if (action === 'delete')
    return (await db.annotation.deleteMany({ where })).count;
  if (action === 'resolve') {
    return (
      await db.annotation.updateMany({
        where: { ...where, status: 'open' },
        data: { status: 'resolved', resolvedAt: new Date() },
      })
    ).count;
  }
  return (
    await db.annotation.updateMany({
      where: { ...where, status: 'resolved' },
      data: { status: 'open', resolvedAt: null },
    })
  ).count;
}
