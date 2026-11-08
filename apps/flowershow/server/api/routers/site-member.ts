import { Prisma, type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { SiteInviteEmail } from '@/emails/site-invite';
import {
  INVITE_TTL_MS,
  MAX_PENDING_INVITES,
  MAX_SITE_MEMBERS,
  deleteExpiredInvites,
  generateInviteToken,
  hashInviteToken,
  inviteUrl,
  normalizeInviteEmail,
} from '@/lib/site-invites';
import {
  canManageSite,
  isSiteOwner,
  siteAuthzSelect,
  siteRole,
} from '@/lib/site-authz';
import PostHogClient from '@/lib/server-posthog';
import { sendTransactionalEmail } from '@/lib/transactional-email';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const emailInput = z.string().trim().toLowerCase().email().max(254);
const idInput = z.string().min(1);

const notFound = () =>
  new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });
const ownerOnly = () =>
  new TRPCError({
    code: 'FORBIDDEN',
    message: 'Only the site owner can manage members',
  });

const pendingInviteConflict = () =>
  new TRPCError({
    code: 'CONFLICT',
    message: 'That address already has a pending invite',
  });

type Ctx = { db: PrismaClient };

const MAX_INVITER_NAME = 80;

/** Load the site with what authz needs. Missing or not visible -> NOT_FOUND. */
async function loadManagedSite(ctx: Ctx, siteId: string, userId: string) {
  const site = await ctx.db.site.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      projectName: true,
      user: { select: { name: true, username: true, email: true } },
      ...siteAuthzSelect(userId),
    },
  });
  if (!site || !canManageSite(userId, site)) throw notFound();
  return site;
}

/** Owner-only actions. Never require Premium (except where the caller checks). */
async function loadOwnedSite(ctx: Ctx, siteId: string, userId: string) {
  const site = await loadManagedSite(ctx, siteId, userId);
  if (!isSiteOwner(userId, site)) throw ownerOnly();
  return site;
}

async function captureMembersChanged(
  ownerId: string,
  props: Record<string, string | number>,
) {
  const posthog = PostHogClient();
  posthog.capture({
    distinctId: ownerId,
    event: 'site_members_changed',
    properties: props,
  });
  await posthog.shutdown();
}

export const siteMemberRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ siteId: idInput }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const site = await loadManagedSite(ctx, input.siteId, userId);
      const isOwner = isSiteOwner(userId, site);

      if (isOwner) await deleteExpiredInvites(ctx.db, input.siteId);

      const rows = await ctx.db.siteMember.findMany({
        where: { siteId: input.siteId },
        select: {
          userId: true,
          createdAt: true,
          user: { select: { username: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      const members = rows.map((m) => ({
        userId: m.userId,
        username: m.user.username,
        name: m.user.name ?? null,
        ...(isOwner ? { email: m.user.email } : {}),
        createdAt: m.createdAt,
      }));

      const base = {
        role: isOwner ? ('owner' as const) : ('editor' as const),
        owner: { username: site.user.username },
        members,
      };
      if (!isOwner) return base;

      const invites = await ctx.db.siteInvite.findMany({
        where: { siteId: input.siteId },
        select: { id: true, email: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      return { ...base, invites };
    }),

  invite: protectedProcedure
    .input(z.object({ siteId: idInput, email: emailInput }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const site = await loadOwnedSite(ctx, input.siteId, userId);

      if (site.plan !== 'PREMIUM') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Inviting editors requires a Premium plan',
        });
      }

      const email = normalizeInviteEmail(input.email);
      if (site.user.email && normalizeInviteEmail(site.user.email) === email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You already own this site',
        });
      }

      await deleteExpiredInvites(ctx.db, input.siteId);

      const existingMember = await ctx.db.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          siteMemberships: { some: { siteId: input.siteId } },
        },
        select: { id: true },
      });
      if (existingMember) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'That person is already an editor of this site',
        });
      }
      const existingInvite = await ctx.db.siteInvite.findFirst({
        where: { siteId: input.siteId, email },
        select: { id: true },
      });
      if (existingInvite) {
        throw pendingInviteConflict();
      }

      const memberCount = await ctx.db.siteMember.count({
        where: { siteId: input.siteId },
      });
      if (memberCount >= MAX_SITE_MEMBERS) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `This site already has ${MAX_SITE_MEMBERS} editors`,
        });
      }
      const inviteCount = await ctx.db.siteInvite.count({
        where: { siteId: input.siteId },
      });
      if (inviteCount >= MAX_PENDING_INVITES) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `This site already has ${MAX_PENDING_INVITES} pending invites`,
        });
      }

      const token = generateInviteToken();
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
      let invite;
      try {
        invite = await ctx.db.siteInvite.create({
          data: {
            siteId: input.siteId,
            email,
            tokenHash: hashInviteToken(token),
            invitedBy: userId,
            expiresAt,
          },
          select: { id: true, email: true, expiresAt: true },
        });
      } catch (err) {
        // A simultaneous invite to the same address hit @@unique([siteId, email]).
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw pendingInviteConflict();
        }
        throw err;
      }

      const inviterName = (
        site.user.name ||
        site.user.username ||
        'Someone'
      ).slice(0, MAX_INVITER_NAME);
      await sendTransactionalEmail({
        to: email,
        subject: `${inviterName} invited you to edit ${site.projectName} on Flowershow`,
        react: SiteInviteEmail({
          inviterName,
          projectName: site.projectName,
          acceptUrl: inviteUrl(token),
        }),
        type: 'site_invite',
        userId,
        idempotencyKey: `site-invite:${invite.id}`,
        distinctId: userId,
        properties: { site_id: input.siteId },
      });

      return {
        id: invite.id,
        email: invite.email,
        expiresAt: invite.expiresAt,
      };
    }),

  revokeInvite: protectedProcedure
    .input(z.object({ siteId: idInput, inviteId: idInput }))
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSite(ctx, input.siteId, ctx.session.user.id);
      await ctx.db.siteInvite.deleteMany({
        where: { id: input.inviteId, siteId: input.siteId },
      });
      return { ok: true as const };
    }),

  remove: protectedProcedure
    .input(z.object({ siteId: idInput, userId: idInput }))
    .mutation(async ({ ctx, input }) => {
      const site = await loadOwnedSite(ctx, input.siteId, ctx.session.user.id);
      await ctx.db.siteMember.deleteMany({
        where: { siteId: input.siteId, userId: input.userId },
      });
      const memberCount = await ctx.db.siteMember.count({
        where: { siteId: input.siteId },
      });
      await captureMembersChanged(site.userId, {
        siteId: input.siteId,
        memberCount,
        change: 'removed',
      });
      return { ok: true as const };
    }),

  // Any member may leave, regardless of plan, so no canManageSite check here.
  leave: protectedProcedure
    .input(z.object({ siteId: idInput }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        select: { id: true, ...siteAuthzSelect(userId) },
      });
      // Owners are not members; they cannot "leave" their own site.
      const role = siteRole(userId, site);
      if (!site || (role !== 'editor' && role !== 'lapsed_editor')) {
        throw notFound();
      }
      await ctx.db.siteMember.deleteMany({
        where: { siteId: input.siteId, userId },
      });
      const memberCount = await ctx.db.siteMember.count({
        where: { siteId: input.siteId },
      });
      await captureMembersChanged(site.userId, {
        siteId: input.siteId,
        memberCount,
        change: 'left',
      });
      return { ok: true as const };
    }),
});
