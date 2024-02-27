import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { fetchGitHubScopes, fetchGitHubScopeRepositories } from "@/lib/github";

export const userRouter = createTRPCRouter({
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
});
