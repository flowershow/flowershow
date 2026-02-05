import { z } from 'zod';
import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';
import { fetchGitHubScopeRepositories, fetchGitHubScopes } from '@/lib/github';
import PostHogClient from '@/lib/server-posthog';
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc';
import { generatePatToken, hashToken } from '@/lib/cli-auth';

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
        username: true,
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
    const sites = await ctx.db.site.findMany({
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

    // Filter out any sites with null ghRepository and assert the type
    return sites.filter(
      (site): site is typeof site & { ghRepository: string } =>
        site.ghRepository !== null,
    );
  }),
  getAccessTokens: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.accessToken.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });
  }),
  createAccessToken: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(1, 'Name is required')
          .max(100, 'Name is too long'),
        expiresAt: z.iso.datetime().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, expiresAt } = input;

      // Generate PAT token
      const patToken = generatePatToken();
      const hashedToken = hashToken(patToken);

      // Store token in database
      await ctx.db.accessToken.create({
        data: {
          token: hashedToken,
          userId: ctx.session.user.id,
          name,
          type: 'PAT',
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      // Return the plaintext token ONCE
      return {
        token: patToken,
        message:
          'Token created successfully. Copy this token now - it will not be shown again.',
      };
    }),
  changeUsername: protectedProcedure
    .input(
      z.object({
        newUsername: z
          .string()
          .min(3, 'Username must be at least 3 characters')
          .max(39, 'Username must be at most 39 characters')
          .regex(
            /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
            'Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen',
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if username is already taken
      const existingUser = await ctx.db.user.findUnique({
        where: { username: input.newUsername },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new Error('Username is already taken');
      }

      // Update username
      await ctx.db.user.update({
        where: { id: userId },
        data: { username: input.newUsername },
      });

      const posthog = PostHogClient();
      posthog.capture({
        distinctId: userId,
        event: 'username_changed',
      });
      await posthog.shutdown();

      return { success: true };
    }),
  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirm: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get user and check for sites with active subscriptions
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          sites: {
            select: {
              id: true,
              projectName: true,
              subscription: {
                select: { status: true },
              },
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (input.confirm !== user.username) {
        throw new Error('Confirmation does not match username');
      }

      // Check for sites with active subscriptions
      const sitesWithActiveSubscriptions = user.sites.filter(
        (site) => site.subscription?.status === 'active',
      );

      if (sitesWithActiveSubscriptions.length > 0) {
        const siteNames = sitesWithActiveSubscriptions
          .map((s) => s.projectName)
          .join(', ');
        throw new Error(
          `Please delete these sites with active subscriptions first: ${siteNames}`,
        );
      }

      // Delete user (cascades to all relations per schema)
      await ctx.db.user.delete({
        where: { id: userId },
      });

      const posthog = PostHogClient();
      posthog.capture({
        distinctId: userId,
        event: 'account_deleted',
      });
      await posthog.shutdown();

      return { success: true };
    }),
});
