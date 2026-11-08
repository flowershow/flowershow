import { Prisma, type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { SiteInviteEmail } from '@/emails/site-invite';
import { isExistingUserEmailTrusted } from '@/lib/account-linking';
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
const tokenInput = z.string().min(1).max(200);

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

const inviteSelect = {
  id: true,
  siteId: true,
  email: true,
  expiresAt: true,
  invitedBy: true,
  site: {
    select: {
      id: true,
      userId: true,
      plan: true,
      projectName: true,
      user: { select: { username: true } },
    },
  },
} as const satisfies Prisma.SiteInviteSelect;
type InviteRow = Prisma.SiteInviteGetPayload<{ select: typeof inviteSelect }>;

const callerSelect = {
  email: true,
  emailVerified: true,
  accounts: { select: { provider: true } },
} as const satisfies Prisma.UserSelect;
type Caller = Prisma.UserGetPayload<{ select: typeof callerSelect }>;

type InviteState =
  | 'ok'
  | 'not_found'
  | 'expired'
  | 'lapsed'
  | 'owner'
  | 'email_mismatch'
  | 'email_untrusted'
  | 'already_member';

export type InviteView = {
  state: InviteState;
  siteId?: string;
  projectName?: string;
  ownerUsername?: string;
  /** Only for `email_mismatch` / `email_untrusted`, so the page can name it. */
  invitedEmail?: string;
};

const inviteNotFound = () =>
  new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found' });

function loadCaller(db: Prisma.TransactionClient, userId: string) {
  return db.user.findUnique({ where: { id: userId }, select: callerSelect });
}

/**
 * The accept checks, in order, without writing. The member limit is checked
 * separately by `acceptInviteRow` (getInvite has no state for it).
 */
async function checkInvite(
  db: Prisma.TransactionClient,
  invite: InviteRow,
  userId: string,
  caller: Caller | null,
): Promise<Exclude<InviteState, 'not_found'>> {
  if (invite.expiresAt.getTime() <= Date.now()) return 'expired';
  if (isSiteOwner(userId, invite.site)) return 'owner';
  if (invite.site.plan !== 'PREMIUM') return 'lapsed';
  if (
    !caller?.email ||
    normalizeInviteEmail(caller.email) !== normalizeInviteEmail(invite.email)
  ) {
    return 'email_mismatch';
  }
  if (!isExistingUserEmailTrusted(caller)) return 'email_untrusted';
  const member = await db.siteMember.findUnique({
    where: { siteId_userId: { siteId: invite.siteId, userId } },
    select: { id: true },
  });
  if (member) return 'already_member';
  return 'ok';
}

/**
 * The one transaction both accept paths share. Every check is re-run inside
 * it against a fresh read of the invite and the caller.
 */
async function acceptInviteRow(
  ctx: Ctx,
  inviteId: string,
  userId: string,
): Promise<{ siteId: string }> {
  let outcome;
  try {
    outcome = await ctx.db.$transaction(async (tx) => {
      const invite = await tx.siteInvite.findUnique({
        where: { id: inviteId },
        select: inviteSelect,
      });
      if (!invite) throw inviteNotFound();
      const caller = await loadCaller(tx, userId);
      const state = await checkInvite(tx, invite, userId, caller);
      const done = { siteId: invite.siteId, ownerId: invite.site.userId };

      switch (state) {
        case 'expired':
          // Returned, not thrown, so the delete commits.
          await tx.siteInvite.delete({ where: { id: invite.id } });
          return { kind: 'expired' as const };
        case 'owner':
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You already own this site',
          });
        case 'lapsed':
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This site is no longer on Premium',
          });
        case 'email_mismatch':
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This invite was sent to a different email address',
          });
        case 'email_untrusted':
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'Sign in with an email link to confirm your address, then accept the invite',
          });
        case 'already_member':
          await tx.siteInvite.delete({ where: { id: invite.id } });
          return { kind: 'already_member' as const, ...done };
        case 'ok':
          break;
      }

      const memberCount = await tx.siteMember.count({
        where: { siteId: invite.siteId },
      });
      if (memberCount >= MAX_SITE_MEMBERS) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `This site already has ${MAX_SITE_MEMBERS} editors`,
        });
      }
      await tx.siteMember.create({
        data: {
          siteId: invite.siteId,
          userId,
          role: 'EDITOR',
          invitedBy: invite.invitedBy,
        },
      });
      await tx.siteInvite.delete({ where: { id: invite.id } });
      return {
        kind: 'joined' as const,
        ...done,
        memberCount: memberCount + 1,
      };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // A concurrent accept of the same invite deleted it first (P2025), or
      // already created this membership (P2002, @@unique([siteId, userId])).
      if (err.code === 'P2025') throw inviteNotFound();
      if (err.code === 'P2002') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You are already an editor of this site',
        });
      }
    }
    throw err;
  }

  if (outcome.kind === 'expired') {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'This invite has expired',
    });
  }
  if (outcome.kind === 'joined') {
    await captureMembersChanged(outcome.ownerId, {
      siteId: outcome.siteId,
      memberCount: outcome.memberCount,
      change: 'joined',
    });
  }
  return { siteId: outcome.siteId };
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
  // Read-only: the same checks as accept, mapped to a state for the page.
  getInvite: protectedProcedure
    .input(z.object({ token: tokenInput }))
    .query(async ({ ctx, input }): Promise<InviteView> => {
      const userId = ctx.session.user.id;
      const invite = await ctx.db.siteInvite.findUnique({
        where: { tokenHash: hashInviteToken(input.token) },
        select: inviteSelect,
      });
      if (!invite) return { state: 'not_found' };
      const caller = await loadCaller(ctx.db, userId);
      const state = await checkInvite(ctx.db, invite, userId, caller);
      const view = {
        state,
        siteId: invite.siteId,
        projectName: invite.site.projectName,
        ownerUsername: invite.site.user.username,
      };
      if (state === 'email_mismatch' || state === 'email_untrusted') {
        return { ...view, invitedEmail: invite.email };
      }
      return view;
    }),

  accept: protectedProcedure
    .input(z.object({ token: tokenInput }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.siteInvite.findUnique({
        where: { tokenHash: hashInviteToken(input.token) },
        select: { id: true },
      });
      if (!invite) throw inviteNotFound();
      return acceptInviteRow(ctx, invite.id, ctx.session.user.id);
    }),

  // Invites addressed to the caller's email, shown only when that email is trusted.
  pendingForMe: protectedProcedure.query(async ({ ctx }) => {
    const caller = await loadCaller(ctx.db, ctx.session.user.id);
    if (!caller?.email || !isExistingUserEmailTrusted(caller)) return [];
    const rows = await ctx.db.siteInvite.findMany({
      where: {
        email: normalizeInviteEmail(caller.email),
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        siteId: true,
        site: {
          select: { projectName: true, user: { select: { username: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      siteId: r.siteId,
      projectName: r.site.projectName,
      ownerUsername: r.site.user.username,
    }));
  }),

  acceptPending: protectedProcedure
    .input(z.object({ inviteId: idInput }))
    .mutation(({ ctx, input }) =>
      acceptInviteRow(ctx, input.inviteId, ctx.session.user.id),
    ),

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
