import { canManageSite, siteAuthzSelect } from '@/lib/site-authz';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { applyAnnotationsBulk } from '@/lib/annotations/bulk';
import { toAnnotationDto } from '@/lib/annotations/dto';
import { loadCurrentPages } from '@/lib/annotations/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

type Ctx = Parameters<Parameters<typeof protectedProcedure.query>[0]>[0]['ctx'];

const notFound = (what: 'Site' | 'Annotation') =>
  new TRPCError({ code: 'NOT_FOUND', message: `${what} not found` });

/** The site, if the session user can manage it (owner, or editor on Premium); otherwise NOT_FOUND. */
async function managedSite(ctx: Ctx, siteId: string) {
  const site = await ctx.db.site.findUnique({
    where: { id: siteId },
    select: {
      ...siteAuthzSelect(ctx.session.user.id),
      projectName: true,
      customDomain: true,
      subdomain: true,
      user: { select: { username: true } },
    },
  });
  if (!site || !canManageSite(ctx.session.user.id, site))
    throw notFound('Site');
  return { ...site, id: siteId };
}

/** The annotation's id and site, if the session user can manage the site; otherwise NOT_FOUND. */
async function managedAnnotation(ctx: Ctx, id: string) {
  const annotation = await ctx.db.annotation.findUnique({
    where: { id },
    select: {
      id: true,
      siteId: true,
      site: { select: siteAuthzSelect(ctx.session.user.id) },
    },
  });
  if (!annotation || !canManageSite(ctx.session.user.id, annotation.site)) {
    throw notFound('Annotation');
  }
  return annotation;
}

export const annotationRouter = createTRPCRouter({
  listForSite: protectedProcedure
    .input(z.object({ siteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const site = await managedSite(ctx, input.siteId);
      const rows = await ctx.db.annotation.findMany({
        where: { siteId: site.id },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
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
      const annotation = await managedAnnotation(ctx, input.id);
      const count = await applyAnnotationsBulk(ctx.db, annotation.siteId, {
        action: input.status === 'resolved' ? 'resolve' : 'reopen',
        ids: [annotation.id],
      });
      return { count };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const annotation = await managedAnnotation(ctx, input.id);
      await ctx.db.annotation.delete({ where: { id: annotation.id } });
      return { success: true as const };
    }),

  deleteAll: protectedProcedure
    .input(z.object({ siteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const site = await managedSite(ctx, input.siteId);
      return {
        count: await applyAnnotationsBulk(ctx.db, site.id, {
          action: 'delete',
        }),
      };
    }),
});
