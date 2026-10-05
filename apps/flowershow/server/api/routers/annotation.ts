import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { applyAnnotationsBulk } from '@/lib/annotations/bulk';
import { toAnnotationDto } from '@/lib/annotations/dto';
import { loadCurrentPages } from '@/lib/annotations/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

type Ctx = Parameters<Parameters<typeof protectedProcedure.query>[0]>[0]['ctx'];

const notFound = (what: 'Site' | 'Annotation') =>
  new TRPCError({ code: 'NOT_FOUND', message: `${what} not found` });

/** The site, if the session user owns it; otherwise NOT_FOUND. */
async function ownedSite(ctx: Ctx, siteId: string) {
  const site = await ctx.db.site.findUnique({
    where: { id: siteId },
    select: {
      userId: true,
      projectName: true,
      customDomain: true,
      subdomain: true,
      user: { select: { username: true } },
    },
  });
  if (!site || site.userId !== ctx.session.user.id) throw notFound('Site');
  return { ...site, id: siteId };
}

/** The annotation's id and site, if the session user owns the site; otherwise NOT_FOUND. */
async function ownedAnnotation(ctx: Ctx, id: string) {
  const annotation = await ctx.db.annotation.findUnique({
    where: { id },
    select: { id: true, siteId: true, site: { select: { userId: true } } },
  });
  if (!annotation || annotation.site.userId !== ctx.session.user.id) {
    throw notFound('Annotation');
  }
  return annotation;
}

export const annotationRouter = createTRPCRouter({
  listForSite: protectedProcedure
    .input(z.object({ siteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const site = await ownedSite(ctx, input.siteId);
      const rows = await ctx.db.annotation.findMany({
        where: { siteId: site.id },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      });
      const pages = await loadCurrentPages(
        ctx.db,
        site,
        rows.map((row) => row.path),
      );
      return rows.map((row) => toAnnotationDto(row, pages.get(row.path)));
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.enum(['open', 'resolved']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const annotation = await ownedAnnotation(ctx, input.id);
      const count = await applyAnnotationsBulk(ctx.db, annotation.siteId, {
        action: input.status === 'resolved' ? 'resolve' : 'reopen',
        ids: [annotation.id],
      });
      return { count };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const annotation = await ownedAnnotation(ctx, input.id);
      await ctx.db.annotation.delete({ where: { id: annotation.id } });
      return { success: true as const };
    }),

  deleteAll: protectedProcedure
    .input(z.object({ siteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const site = await ownedSite(ctx, input.siteId);
      return {
        count: await applyAnnotationsBulk(ctx.db, site.id, {
          action: 'delete',
        }),
      };
    }),
});
