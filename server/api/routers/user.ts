import { z } from 'zod';
import { fetchGitHubScopeRepositories, fetchGitHubScopes } from '@/lib/github';
import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc';

export const userRouter = createTRPCRouter({
  getStats: publicProcedure.query(async ({ ctx }) => {
    // Get total user count (excluding anonymous user)
    const userCount = await ctx.db.user.count({
      where: {
        id: { not: ANONYMOUS_USER_ID },
      },
    });

    // Get recent users with avatars (for social proof display)
    const recentUsers = await ctx.db.user.findMany({
      where: {
        id: { not: ANONYMOUS_USER_ID },
        image: { not: null },
      },
      select: {
        id: true,
        image: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      userCount,
      recentUsers,
    };
  }),
  getUser: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        feedback: true,
        sites: true,
      },
    });
  }),
  getSites: protectedProcedure
    .input(z.object({ limit: z.number().min(1).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await ctx.db.site.findMany({
        where: { userId: ctx.session.user.id },
        take: input?.limit,
      });
    }),
  getGitHubScopes: protectedProcedure.query(async ({ ctx }) => {
    const accessToken = ctx.session.accessToken;
    return await fetchGitHubScopes(accessToken);
  }),
  getGitHubScopeRepos: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: scope }) => {
      const {
        accessToken,
        user: { username },
      } = ctx.session;
      return await fetchGitHubScopeRepositories({
        scope: username === scope ? 'self' : scope,
        accessToken,
      });
    }),
  submitFeedback: protectedProcedure
    .input(
      z.object({
        rating: z.number().min(1).max(5),
        feedback: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get current user to check existing feedback
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { feedback: true },
      });

      // Get existing feedback array or create new one
      const existingFeedback = user?.feedback
        ? Array.isArray(user.feedback)
          ? user.feedback
          : [user.feedback]
        : [];

      // Check if user has submitted feedback in the last hour
      const lastFeedback = existingFeedback[existingFeedback.length - 1];

      if (lastFeedback) {
        const lastSubmissionTime = new Date((lastFeedback as any).timestamp);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (lastSubmissionTime > fiveMinutesAgo) {
          throw new Error(
            '⏳ Please wait at least 5min between feedback submissions, or click Support and create an issue or start a discussion.',
          );
        }
      }

      // Create new feedback entry with timestamp
      const newFeedback = {
        ...input,
        timestamp: new Date().toISOString(),
      };

      // Update user with appended feedback
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          feedback: [...existingFeedback, newFeedback],
        },
      });
      return { success: true };
    }),
  hasOAuthOnlySites: protectedProcedure.query(async ({ ctx }) => {
    // Check if user has any sites that use OAuth (no installationId)
    return await ctx.db.site.findMany({
      where: {
        userId: ctx.session.user.id,
        installationId: null, // Sites without GitHub App installation
        NOT: { ghRepository: null },
      },
      select: {
        id: true,
        projectName: true,
        ghRepository: true,
      },
      orderBy: {
        projectName: 'asc',
      },
    });
  }),
});
