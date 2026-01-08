import * as Sentry from '@sentry/nextjs';
import { TRPCError } from '@trpc/server';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { env } from '@/env.mjs';
import { getInstallationToken } from '@/lib/github';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

/**
 * GitHub App tRPC Router
 * Handles GitHub App installation management and repository queries
 */
export const githubRouter = createTRPCRouter({
  /**
   * List all GitHub App installations for the authenticated user
   */
  listInstallations: protectedProcedure.query(async ({ ctx }) => {
    return Sentry.startSpan(
      {
        op: 'trpc.query',
        name: 'github.listInstallations',
      },
      async (span) => {
        span.setAttribute('user_id', ctx.session.user.id);

        const installations = await ctx.db.gitHubInstallation.findMany({
          where: {
            userId: ctx.session.user.id,
          },
          include: {
            repositories: {
              orderBy: {
                repositoryName: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        span.setAttribute('installations_count', installations.length);

        return installations.map((installation) => ({
          id: installation.id,
          installationId: installation.installationId.toString(),
          accountType: installation.accountType,
          accountLogin: installation.accountLogin,
          accountId: installation.accountId.toString(),
          suspendedAt: installation.suspendedAt,
          suspendedBy: installation.suspendedBy,
          createdAt: installation.createdAt,
          updatedAt: installation.updatedAt,
          repositories: installation.repositories.map((repo) => ({
            id: repo.id,
            repositoryId: repo.repositoryId.toString(),
            repositoryName: repo.repositoryName,
            repositoryFullName: repo.repositoryFullName,
            isPrivate: repo.isPrivate,
            createdAt: repo.createdAt,
          })),
        }));
      },
    );
  }),

  /**
   * Get a specific installation by ID
   */
  getInstallation: protectedProcedure
    .input(z.object({ installationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return Sentry.startSpan(
        {
          op: 'trpc.query',
          name: 'github.getInstallation',
        },
        async (span) => {
          span.setAttribute('installation_id', input.installationId);

          const installation = await ctx.db.gitHubInstallation.findFirst({
            where: {
              id: input.installationId,
              userId: ctx.session.user.id,
            },
            include: {
              repositories: {
                orderBy: {
                  repositoryName: 'asc',
                },
              },
            },
          });

          if (!installation) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Installation not found',
            });
          }

          return {
            id: installation.id,
            installationId: installation.installationId.toString(),
            accountType: installation.accountType,
            accountLogin: installation.accountLogin,
            accountId: installation.accountId.toString(),
            suspendedAt: installation.suspendedAt,
            suspendedBy: installation.suspendedBy,
            createdAt: installation.createdAt,
            updatedAt: installation.updatedAt,
            repositories: installation.repositories.map((repo) => ({
              id: repo.id,
              repositoryId: repo.repositoryId.toString(),
              repositoryName: repo.repositoryName,
              repositoryFullName: repo.repositoryFullName,
              isPrivate: repo.isPrivate,
              createdAt: repo.createdAt,
            })),
          };
        },
      );
    }),

  /**
   * Get repositories for a specific installation
   */
  getInstallationRepositories: protectedProcedure
    .input(z.object({ installationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return Sentry.startSpan(
        {
          op: 'trpc.query',
          name: 'github.getInstallationRepositories',
        },
        async (span) => {
          span.setAttribute('installation_id', input.installationId);

          // Verify user owns this installation
          const installation = await ctx.db.gitHubInstallation.findFirst({
            where: {
              id: input.installationId,
              userId: ctx.session.user.id,
            },
          });

          if (!installation) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Installation not found',
            });
          }

          const repositories =
            await ctx.db.gitHubInstallationRepository.findMany({
              where: {
                installationId: input.installationId,
              },
              orderBy: {
                repositoryName: 'asc',
              },
            });

          span.setAttribute('repositories_count', repositories.length);

          return repositories.map((repo) => ({
            id: repo.id,
            repositoryId: repo.repositoryId.toString(),
            repositoryName: repo.repositoryName,
            repositoryFullName: repo.repositoryFullName,
            isPrivate: repo.isPrivate,
            createdAt: repo.createdAt,
          }));
        },
      );
    }),

  /**
   * Sync repositories for an installation from GitHub
   */
  syncInstallation: protectedProcedure
    .input(z.object({ installationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return Sentry.startSpan(
        {
          op: 'trpc.mutation',
          name: 'github.syncInstallation',
        },
        async (span) => {
          span.setAttribute('installation_id', input.installationId);

          // Verify user owns this installation
          const installation = await ctx.db.gitHubInstallation.findFirst({
            where: {
              id: input.installationId,
              userId: ctx.session.user.id,
            },
          });

          if (!installation) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Installation not found',
            });
          }

          // Get installation access token
          const installationAccessToken = await getInstallationToken(
            installation.id,
          );

          // Fetch repositories from GitHub with pagination
          let allRepositories: Array<{
            id: number;
            name: string;
            full_name: string;
            private: boolean;
          }> = [];
          let page = 1;
          let hasMorePages = true;

          while (hasMorePages) {
            const reposResponse = await fetch(
              `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
              {
                headers: {
                  Authorization: `Bearer ${installationAccessToken}`,
                  Accept: 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                },
              },
            );

            if (!reposResponse.ok) {
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to fetch repositories from GitHub: ${reposResponse.statusText}`,
              });
            }

            const reposData = (await reposResponse.json()) as {
              total_count: number;
              repositories: Array<{
                id: number;
                name: string;
                full_name: string;
                private: boolean;
              }>;
            };

            allRepositories = [...allRepositories, ...reposData.repositories];

            // Check if there are more pages
            hasMorePages = reposData.repositories.length === 100;
            page++;
          }

          // Delete existing repositories
          await ctx.db.gitHubInstallationRepository.deleteMany({
            where: {
              installationId: input.installationId,
            },
          });

          // Insert new repositories
          if (allRepositories.length > 0) {
            await ctx.db.gitHubInstallationRepository.createMany({
              data: allRepositories.map((repo) => ({
                installationId: input.installationId,
                repositoryId: BigInt(repo.id),
                repositoryName: repo.name,
                repositoryFullName: repo.full_name,
                isPrivate: repo.private,
              })),
            });
          }

          // Update installation's updatedAt timestamp
          await ctx.db.gitHubInstallation.update({
            where: { id: input.installationId },
            data: { updatedAt: new Date() },
          });

          span.setAttribute('repositories_synced', allRepositories.length);

          return {
            success: true,
            repositoriesCount: allRepositories.length,
          };
        },
      );
    }),

  /**
   * Delete an installation from the database
   * Note: This does not uninstall from GitHub - user must do that on GitHub
   */
  deleteInstallation: protectedProcedure
    .input(z.object({ installationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return Sentry.startSpan(
        {
          op: 'trpc.mutation',
          name: 'github.deleteInstallation',
        },
        async (span) => {
          span.setAttribute('installation_id', input.installationId);

          // Verify user owns this installation
          const installation = await ctx.db.gitHubInstallation.findFirst({
            where: {
              id: input.installationId,
              userId: ctx.session.user.id,
            },
            include: {
              sites: true,
            },
          });

          if (!installation) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Installation not found',
            });
          }

          // Check if any sites are using this installation
          if (installation.sites.length > 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Cannot delete installation: ${installation.sites.length} site(s) are using it`,
            });
          }

          // Delete the installation (cascade will delete repositories)
          await ctx.db.gitHubInstallation.delete({
            where: { id: input.installationId },
          });

          return {
            success: true,
          };
        },
      );
    }),

  /**
   * Generate GitHub App installation URL
   * Migrated from /api/github-app/installation-url
   */
  getInstallationUrl: protectedProcedure
    .input(
      z.object({
        suggestedTargetId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return Sentry.startSpan(
        {
          op: 'trpc.mutation',
          name: 'github.getInstallationUrl',
        },
        async (span) => {
          span.setAttribute('user_id', ctx.session.user.id);

          // Create a signed JWT token with user ID
          // This allows us to identify the user in the callback without relying on cookies
          const secret = new TextEncoder().encode(env.NEXTAUTH_SECRET);
          const state = await new SignJWT({ userId: ctx.session.user.id })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('15m') // Token expires in 15 minutes
            .sign(secret);

          // Build GitHub App installation URL
          const installUrl = new URL(
            `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`,
          );

          installUrl.searchParams.set('state', state);

          if (input.suggestedTargetId) {
            installUrl.searchParams.set(
              'suggested_target_id',
              input.suggestedTargetId,
            );
            span.setAttribute('suggested_target_id', input.suggestedTargetId);
          }

          return {
            url: installUrl.toString(),
            state,
          };
        },
      );
    }),
});
