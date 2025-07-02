import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { fetchGitHubScopes, fetchGitHubScopeRepositories } from "@/lib/github";

export const userRouter = createTRPCRouter({
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
        scope: username === scope ? "self" : scope,
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

      // Create new feedback entry with timestamp
      const newFeedback = {
        ...input,
        timestamp: new Date().toISOString(),
      };

      // Get existing feedback array or create new one
      const existingFeedback = user?.feedback
        ? Array.isArray(user.feedback)
          ? user.feedback
          : [user.feedback]
        : [];

      // Update user with appended feedback
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          feedback: [...existingFeedback, newFeedback],
        },
      });
      return { success: true };
    }),
});
