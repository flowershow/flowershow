import { Blob, Prisma, PrismaClient, Status } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { revalidateTag, unstable_cache } from 'next/cache';
import { z } from 'zod';
import { isNavDropdown, SiteConfig } from '@/components/types';
import { deepMerge, resolveSiteConfig } from '@/lib/site-config';
import { env } from '@/env.mjs';
import { inngest } from '@/inngest/client';
import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';
import { buildSiteTree } from '@/lib/build-site-tree';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import {
  deleteProject,
  fetchFile,
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from '@/lib/domains';
import { checkIfBranchExists, fetchGitHubRepoTree } from '@/lib/github';
import { isEmoji } from '@/lib/is-emoji';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import { resolveWikiLinkToFilePath } from '@/lib/resolve-wiki-link';
import PostHogClient from '@/lib/server-posthog';
import { getWikiLinkValue, isWikiLink } from '@/lib/wiki-link';
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc';
import { jwtVerify } from 'jose';
import { SITE_ACCESS_COOKIE_NAME } from '@/lib/const';
import { siteKeyBytes } from '@/lib/site-hmac-key';
import { buildSiteSubdomain } from '@/lib/site-subdomain';
import {
  PageMetadata,
  PublicSite,
  publicSiteSchema,
  publicSiteSelect,
  SiteUpdateKey,
} from '../types';

/**
 * Throws UNAUTHORIZED if the caller does not have access to a PASSWORD-protected site.
 * Site owners and callers with a valid site-access cookie are allowed through.
 */
async function assertSiteAccess(
  site: { privacyMode: string; tokenVersion: number; userId: string } | null,
  siteId: string,
  ctx: {
    session: { user?: { id: string } } | null;
    headers: Headers;
  },
) {
  if (!site || site.privacyMode !== 'PASSWORD') return;
  if (ctx.session?.user?.id === site.userId) return;

  const cookieHeader = ctx.headers.get('cookie') ?? '';
  const cookieName = SITE_ACCESS_COOKIE_NAME(siteId);
  let token: string | undefined;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k?.trim() === cookieName) {
      token = v.join('=');
      break;
    }
  }

  if (!token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Site access required',
    });
  }
  try {
    const secret = await siteKeyBytes(siteId, site.tokenVersion);
    await jwtVerify(token, secret, { audience: siteId });
  } catch {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Site access required',
    });
  }
}

const asciiPrintableNoEdgeSpaces = new RegExp(
  '^(?=.{8,128}$)[!-~](?:[ -~]*[!-~])?$',
);

export const siteRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        projectName: z.string().min(1),
      }),
    )
    .output(publicSiteSchema.nullable())
    .query(async ({ ctx, input }): Promise<PublicSite | null> => {
      return ctx.db.site.findFirst({
        where: {
          AND: [
            { projectName: input.projectName },
            { user: { username: input.username } },
          ],
        },
        select: publicSiteSelect,
      });
    }),
  getAnonymous: publicProcedure
    .input(
      z.object({
        projectName: z.string().min(1),
      }),
    )
    .output(publicSiteSchema.nullable())
    .query(async ({ ctx, input }): Promise<PublicSite | null> => {
      return ctx.db.site.findFirst({
        where: {
          projectName: input.projectName,
          userId: ANONYMOUS_USER_ID,
        },
        select: publicSiteSelect,
      });
    }),
  getByDomain: publicProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .output(publicSiteSchema.nullable())
    .query(async ({ ctx, input }): Promise<PublicSite | null> => {
      return await ctx.db.site.findFirst({
        where: {
          customDomain: input.domain,
        },
        select: publicSiteSelect,
      });
    }),
  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .output(publicSiteSchema.nullable())
    .query(async ({ ctx, input }): Promise<PublicSite | null> => {
      return await ctx.db.site.findFirst({
        where: { id: input.id },
        select: publicSiteSelect,
      });
    }),
  getMany: publicProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .output(z.array(publicSiteSchema))
    .query(async ({ ctx, input }): Promise<PublicSite[]> => {
      if (input.ids.length === 0) {
        return [];
      }
      return await ctx.db.site.findMany({
        where: { id: { in: input.ids } },
        select: publicSiteSelect,
        orderBy: { createdAt: 'desc' },
      });
    }),
  getAll: protectedProcedure
    .output(z.array(publicSiteSchema))
    .query(async ({ ctx }): Promise<PublicSite[]> => {
      if (ctx.session.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }
      return await ctx.db.site.findMany({ select: publicSiteSelect });
    }),
  create: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1).max(32),
      }),
    )
    .output(publicSiteSchema)
    .mutation(async ({ ctx, input }): Promise<PublicSite> => {
      const baseName = input.projectName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-');

      const projectName = await ensureUniqueProjectName(
        ctx.db,
        ctx.session.user.id,
        baseName,
      );

      const creator = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, name: true, username: true },
      });

      const created = await ctx.db.site.create({
        data: {
          projectName,
          subdomain: buildSiteSubdomain(projectName, creator?.username ?? ''),
          autoSync: false,
          user: { connect: { id: ctx.session.user.id } },
        },
      });

      if (creator?.email) {
        const siteUrl = `https://${created.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;
        await inngest.send({
          name: 'email/site-created.send',
          data: {
            userId: ctx.session.user.id,
            email: creator.email,
            name: creator.name,
            siteUrl,
            projectName,
          },
        });
      }

      const posthog = await PostHogClient();
      posthog.capture({
        distinctId: created.userId ?? ctx.session.user.id,
        event: 'site_created',
        properties: { siteId: created.id, client_type: 'web', empty: true },
      });
      await posthog.shutdown();

      const fresh = await ctx.db.site.findUnique({
        where: { id: created.id },
        select: publicSiteSelect,
      });
      if (!fresh) {
        throw new Error('Site not found after creation');
      }
      return fresh;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        key: z.enum(SiteUpdateKey),
        value: z.string(),
      }),
    )
    .output(publicSiteSchema)
    .mutation(async ({ ctx, input }): Promise<PublicSite> => {
      const { id, key, value } = input;

      const site = await ctx.db.site.findUnique({
        where: { id },
        include: {
          user: true,
          installationRepository: {
            select: { installationId: true, repositoryFullName: true },
          },
        },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      const repoFullName =
        site.installationRepository?.repositoryFullName ?? site.ghRepository;

      // Utils
      const parseIfBoolString = (v: string) =>
        v === 'true' ? true : v === 'false' ? false : v;
      const toNullIfEmpty = (v: string) => (v.trim() === '' ? null : v.trim());

      if (key === 'customDomain') {
        const newDomain = toNullIfEmpty(value);
        if (newDomain && !isFeatureEnabled(Feature.CustomDomain, site)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Custom domains require a Premium plan',
          });
        }
        if (!newDomain) {
          await ctx.db.site.update({
            where: { id },
            data: { customDomain: null },
            select: publicSiteSelect,
          });

          // Remove old domain from Vercel
          if (
            env.NEXT_PUBLIC_VERCEL_ENV === 'production' &&
            site.customDomain
          ) {
            await removeDomainFromVercelProject(site.customDomain);
          }
        } else {
          if (env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
            if (!validDomainRegex.test(newDomain)) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Invalid domain',
              });
            }

            await ctx.db.site.update({
              where: { id },
              data: { customDomain: newDomain },
              select: publicSiteSelect,
            });

            // Provision domain(s) in Vercel (best-effort)
            await Promise.all([
              addDomainToVercel(newDomain),
              // Optional: add www subdomain as well and redirect to apex domain
              addDomainToVercel(`www.${newDomain}`),
            ]);

            // If the site had a different customDomain before, we need to remove it from Vercel
            if (site.customDomain && site.customDomain !== newDomain) {
              await removeDomainFromVercelProject(site.customDomain);
            }

            // Send a delayed email to check if domain is properly configured
            if (site.user.email) {
              await inngest.send({
                name: 'email/custom-domain.check',
                data: {
                  userId: ctx.session.user.id,
                  email: site.user.email,
                  name: site.user.name,
                  domain: newDomain,
                  siteId: id,
                },
              });
            }
          } else {
            // Non-production: only update DB
            await ctx.db.site.update({
              where: { id },
              data: { customDomain: value },
            });
          }
        }
      } else if (key === 'rootDir') {
        const newRoot = toNullIfEmpty(value);

        await ctx.db.site.update({
          where: { id },
          data: { rootDir: newRoot },
        });
        await deleteProject(id).catch(() => {}); // TODO handle it in a better way
        if (repoFullName && site.ghBranch) {
          await inngest.send({
            name: 'site/sync',
            data: {
              siteId: id,
              ghRepository: repoFullName,
              ghBranch: site.ghBranch,
              rootDir: newRoot,
              accessToken: ctx.session.accessToken,
              installationId:
                site.installationRepository?.installationId ?? undefined,
            },
          });
        }
      } else if (key === 'autoSync') {
        const enable = value === 'true';
        await ctx.db.site.update({
          where: { id },
          data: { autoSync: enable },
        });
      } else {
        const converted = parseIfBoolString(value);
        await ctx.db.site.update({
          where: { id },
          data: { [key]: converted },
        });

        // If enableSearch is being turned on, trigger a force sync to index all files
        // Note: this is a temporary solution, to make sure people who upgrade now have their
        // site's indexes updated (but we index all documents, even for non-premium users atm, which we shouldn't)
        if (
          repoFullName &&
          site.ghBranch &&
          key === 'enableSearch' &&
          converted === true
        ) {
          await inngest.send({
            name: 'site/sync',
            data: {
              siteId: id,
              ghRepository: repoFullName,
              ghBranch: site.ghBranch,
              rootDir: site.rootDir,
              accessToken: ctx.session.accessToken,
              installationId:
                site.installationRepository?.installationId ?? undefined,
              forceSync: true,
            },
          });
        }
      }

      // Analytics (best-effort)
      const posthog = PostHogClient();
      posthog.capture({
        distinctId: site.userId,
        event: 'site_settings_changed',
        properties: {
          siteId: site.id,
          setting: key,
          new_value:
            key === 'customDomain' ? (value ? 'set' : 'removed') : value,
        },
      });
      await posthog.shutdown();
      // Return canonical public shape
      const fresh = await ctx.db.site.findUnique({
        where: { id },
        select: publicSiteSelect,
      });
      if (!fresh) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found after update',
        });
      }

      revalidateTag(`${site.id}`);
      return fresh;
    }),
  setPasswordProtection: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        enabled: z.boolean().optional(),
        password: z
          .string()
          .refine((s) => asciiPrintableNoEdgeSpaces.test(s), {
            message:
              'Password must be 8–128 printable characters with no leading/trailing spaces.',
          })
          .optional(),
      }),
    )
    .output(publicSiteSchema)
    .mutation(async ({ ctx, input }): Promise<PublicSite> => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.id },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      if (input.enabled) {
        if (!isFeatureEnabled(Feature.PasswordProtection, site)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Password protection requires a Premium plan',
          });
        }
        if (!input.password) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You need to provide a password to set',
          });
        } else {
          const hash = await bcrypt.hash(input.password, 12);
          await ctx.db.site.update({
            where: { id: input.id },
            data: {
              privacyMode: 'PASSWORD',
              accessPasswordHash: hash,
              accessPasswordUpdatedAt: new Date(),
              tokenVersion: {
                increment: 1,
              },
            },
          });
        }
      } else {
        await ctx.db.site.update({
          where: { id: input.id },
          data: {
            privacyMode: 'PUBLIC',
            accessPasswordHash: null,
            accessPasswordUpdatedAt: new Date(),
          },
        });
      }
      const fresh = await ctx.db.site.findUnique({
        where: { id: input.id },
        select: publicSiteSelect,
      });
      if (!fresh) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found after update',
        });
      }

      return fresh;
    }),

  updateConfigJson: protectedProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        config: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        select: { id: true, userId: true, configJson: true },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      const existing = (site.configJson ?? {}) as Record<string, unknown>;
      const patch = input.config as Record<string, unknown>;
      const merged = deepMerge(existing, patch);

      await ctx.db.site.update({
        where: { id: input.siteId },
        data: { configJson: merged as Prisma.InputJsonValue },
      });

      revalidateTag(input.siteId);
      revalidateTag(`${input.siteId}-config`);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.id },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      await ctx.db.site.delete({
        where: { id: site.id },
      });

      await inngest.send({
        name: 'site/delete',
        data: {
          siteId: site.id,
          accessToken: ctx.session.accessToken,
        },
      });

      const posthog = PostHogClient();
      posthog.capture({
        distinctId: site.userId,
        event: 'site_deleted',
        properties: { siteId: site.id, client_type: 'web' },
      });
      await posthog.shutdown();

      return { id: site.id };
    }),
  sync: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        force: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findFirst({
        where: {
          id: input.id,
        },
        include: {
          installationRepository: {
            select: { installationId: true, repositoryFullName: true },
          },
        },
      });

      if (
        !site ||
        (ctx.session.user.role !== 'ADMIN' &&
          site.userId !== ctx.session.user.id)
      ) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      const { id, ghBranch } = site;
      const repoFullName =
        site.installationRepository?.repositoryFullName ?? site.ghRepository;

      if (!repoFullName || !ghBranch) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Can't sync a site with no GitHub repository connected.",
        });
      }

      const accessToken = ctx.session.accessToken;
      const derivedInstallationId =
        site.installationRepository?.installationId ?? undefined;

      const posthog = PostHogClient();
      const syncProperties = {
        siteId: id,
        source: 'manual',
        repository: repoFullName,
        branch: ghBranch,
        rootDir: site.rootDir,
        forceSync: input.force,
        hasInstallation: Boolean(site.installationRepositoryId),
      };

      try {
        await inngest.send({
          name: 'site/sync',
          data: {
            siteId: id,
            ghRepository: repoFullName,
            ghBranch,
            rootDir: site.rootDir,
            accessToken,
            installationId: derivedInstallationId,
            forceSync: input.force,
          },
        });

        posthog.capture({
          distinctId: ctx.session.user.id,
          event: 'site_sync_triggered',
          properties: syncProperties,
        });
        posthog.capture({
          distinctId: ctx.session.user.id,
          event: 'content_published',
          properties: {
            publish_method: 'github_sync',
            site_id: id,
          },
        });
      } catch (error) {
        posthog.captureException(error, 'system', {
          route: 'site.sync',
          source: 'manual',
          siteId: id,
          repository: repoFullName,
          branch: ghBranch,
          forceSync: input.force,
          hasInstallation: Boolean(site.installationRepositoryId),
          userId: ctx.session.user.id,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to trigger site sync',
        });
      } finally {
        await posthog.shutdown();
      }
    }),

  getSyncStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<{
        status: 'UNPUBLISHED' | 'SUCCESS' | 'PENDING' | 'ERROR' | 'OUTDATED';
        error?: string | null;
        lastSyncedAt?: Date | null;
      }> => {
        // Get site data for tree comparison
        const site = await ctx.db.site.findUnique({
          where: { id: input.id },
          include: {
            installationRepository: {
              select: { installationId: true, repositoryFullName: true },
            },
          },
        });

        if (!site || site.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Site not found',
          });
        }

        // Get all blobs for the site
        const blobs = await ctx.db.blob.findMany({
          where: {
            siteId: site.id,
          },
          select: {
            syncStatus: true,
            syncError: true,
            updatedAt: true,
            path: true,
          },
        });

        // Calculate aggregate sync status
        // Site-level status is separate from blob-level Status enum
        let status:
          | 'UNPUBLISHED'
          | 'SUCCESS'
          | 'PENDING'
          | 'ERROR'
          | 'OUTDATED';
        let error: string | null = null;
        // Get the most recent update date

        if (blobs.length === 0) {
          // If tree is set, sync already ran but found no files (e.g. rootDir doesn't exist)
          if (site.tree) {
            return { status: 'SUCCESS', lastSyncedAt: null };
          }
          return {
            status: 'UNPUBLISHED',
            lastSyncedAt: null,
          };
        }

        const lastSyncedAt =
          blobs
            .map((b) => b.updatedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0] || null;

        // If any blob is UPLOADING or PROCESSING, site sync is PENDING
        if (
          blobs.some(
            (b) =>
              b.syncStatus === 'UPLOADING' || b.syncStatus === 'PROCESSING',
          )
        ) {
          status = 'PENDING';
        }
        // If any blob is ERROR, site is ERROR
        else if (blobs.some((b) => b.syncStatus === 'ERROR')) {
          status = 'ERROR';
          error = blobs
            .filter((b) => b.syncStatus === 'ERROR')
            .map((b) =>
              b.syncError
                ? `[${b.path}]: ${b.syncError}`
                : `[${b.path}]: Unknown error`,
            )
            .join('\n');
        } else if (
          !site.installationRepository?.repositoryFullName &&
          !site.ghRepository
        ) {
          return {
            status: 'SUCCESS',
            lastSyncedAt,
          };
        } else {
          if (!site.tree) {
            return {
              status: 'PENDING',
            };
          }
          const repoForTree =
            site.installationRepository?.repositoryFullName ??
            site.ghRepository!;
          const gitHubTree = await fetchGitHubRepoTree({
            ghRepository: repoForTree,
            ghBranch: site.ghBranch!,
            accessToken: ctx.session.accessToken,
            installationId:
              site.installationRepository?.installationId ?? undefined,
          });
          status =
            site.tree?.['sha'] === gitHubTree.sha ? 'SUCCESS' : 'OUTDATED';
        }

        return {
          status,
          error,
          lastSyncedAt,
        };
      },
    ),
  getCustomStyles: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async (input) => {
          const site = await ctx.db.site.findUnique({
            where: { id: input.siteId },
            include: {
              user: true,
            },
          });

          if (!site) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Site not found',
            });
          }

          try {
            return await fetchFile({
              projectId: site.id,
              path: 'custom.css',
            });
          } catch {
            return null;
          }
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-css`],
        },
      )(input);
    }),

  getConfig: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async (input) => {
          const site = await ctx.db.site.findUnique({
            where: { id: input.siteId },
            select: {
              id: true,
              customDomain: true,
              subdomain: true,
              configJson: true,
              user: { select: { username: true } },
            },
          });

          if (!site) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Site not found',
            });
          }

          const siteHostname =
            site.customDomain ??
            `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

          try {
            const configJson = await fetchFile({
              projectId: site.id,
              path: 'config.json',
            });
            const config = configJson
              ? (JSON.parse(configJson) as SiteConfig)
              : null;

            const dbConfigJson = (site.configJson ?? null) as SiteConfig | null;
            if (!config)
              return dbConfigJson
                ? resolveSiteConfig(dbConfigJson, null)
                : null;

            console.log({ config });

            // Resolve media paths to full URLs
            const keysToResolve = ['image', 'logo', 'favicon', 'thumbnail'];
            keysToResolve.forEach((key) => {
              if (
                (key === 'favicon' || key === 'logo') &&
                config[key] &&
                isEmoji(config[key])
              ) {
                return;
              }

              if (config[key]) {
                config[key] = resolveFilePathToUrlPath({
                  target: config[key],
                  siteHostname,
                });
              }
            });

            if (config.nav?.links) {
              config.nav.links.forEach((item) => {
                if (isNavDropdown(item)) {
                  item.links.forEach((link) => {
                    link.href = resolveFilePathToUrlPath({
                      target: link.href,
                      siteHostname,
                    });
                  });
                } else {
                  item.href = resolveFilePathToUrlPath({
                    target: item.href,
                    siteHostname,
                  });
                }
              });
            }

            if (config.nav?.logo && !isEmoji(config.nav.logo)) {
              config.nav.logo = resolveFilePathToUrlPath({
                target: config.nav.logo,
                siteHostname,
              });
            }

            if (config.nav?.social) {
              config.nav.social.forEach((social) => {
                social.href = resolveFilePathToUrlPath({
                  target: social.href,
                  siteHostname,
                });
              });
            }

            if (config.nav?.cta) {
              config.nav.cta.href = resolveFilePathToUrlPath({
                target: config.nav.cta.href,
                siteHostname,
              });
            }

            if (
              config.hero &&
              typeof config.hero === 'object' &&
              !Array.isArray(config.hero)
            ) {
              if (typeof config.hero.image === 'string') {
                config.hero.image = resolveFilePathToUrlPath({
                  target: config.hero.image,
                  siteHostname,
                });
              }

              if (Array.isArray(config.hero.cta)) {
                config.hero.cta.forEach((c) => {
                  if (typeof c?.href === 'string') {
                    c.href = resolveFilePathToUrlPath({
                      target: c.href,
                      siteHostname,
                    });
                  }
                });
              }
            }

            if (config.footer?.navigation) {
              config.footer.navigation.forEach((group) => {
                group.links.forEach((link) => {
                  link.href = resolveFilePathToUrlPath({
                    target: link.href,
                    siteHostname,
                  });
                });
              });
            }

            return resolveSiteConfig(dbConfigJson, config);
          } catch {
            return null;
          }
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-config`],
        },
      )(input);
    }),

  getSiteTree: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        orderBy: z.enum(['path', 'title']).default('title'),
        paths: z.array(z.string()).optional(),
        contentHide: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async (input) => {
          const site = await ctx.db.site.findUnique({
            where: { id: input.siteId },
            include: {
              user: true,
            },
          });

          if (!site) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Site not found',
            });
          }

          const siteHostname =
            site.customDomain ??
            `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

          // Get all blobs for the site
          const blobs = (await ctx.db.blob.findMany({
            where: {
              siteId: site.id,
              extension: { in: ['md', 'mdx'] },
              metadata: { not: Prisma.AnyNull }, // metadata must exist
              OR: [
                { metadata: { path: ['publish'], equals: true } }, // explicitly published
                { metadata: { path: ['publish'], equals: Prisma.AnyNull } }, // no publish field
              ],
            },
            select: {
              path: true,
              appPath: true,
              permalink: true,
              metadata: true,
            },
          })) as Blob[];

          const paths = input.paths ?? [];
          const prefixes = paths.map((p) => p.replace(/^\//, ''));
          const hidePrefixes = (input.contentHide ?? []).map((p) =>
            p.replace(/^\//, ''),
          );
          const filteredBlobs = blobs.filter((b) => {
            // Include filter: if paths are configured, only include matching blobs
            if (
              prefixes.length > 0 &&
              !prefixes.some((p) => b.path === p || b.path.startsWith(`${p}/`))
            ) {
              return false;
            }
            // Hide filter: remove blobs matching any contentHide prefix
            if (
              hidePrefixes.some(
                (p) => b.path === p || b.path.startsWith(`${p}/`),
              )
            ) {
              return false;
            }
            return true;
          });

          const tree = buildSiteTree(filteredBlobs, {
            orderBy: input.orderBy,
            prefix: '',
          });

          // When a single sidebar path is configured, flatten the tree
          // so the sidebar and breadcrumbs aren't nested inside that one dir.
          const onlyChild = tree.children[0];
          if (
            prefixes.length === 1 &&
            tree.children.length === 1 &&
            onlyChild?.kind === 'dir'
          ) {
            return onlyChild.children;
          }

          return tree.children;
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-sitemap`],
        },
      )(input);
    }),
  getListComponentItems: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        dir: z.string().optional(), // absolute dir
        slots: z.looseObject({ media: z.any().optional() }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const site = await ctx.db.site.findFirst({
        where: {
          AND: [{ id: input.siteId }],
        },
        include: {
          user: true,
        },
      });

      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      return await unstable_cache(
        async (input) => {
          const _dir = input.dir.replace(/^\//, '');
          const dir = _dir && (_dir.endsWith('/') ? _dir : `${_dir}/`);
          const dirReadmePattern = dir + 'README.md(x)?';
          const dirIndexPattern = dir + 'index.md(x)?';

          const siteHostname =
            site.customDomain ??
            `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

          const siteFilePaths = (
            await ctx.db.blob.findMany({
              where: {
                siteId: input.siteId,
              },
              select: {
                path: true,
              },
            })
          ).map((b) => b.path);

          const blobs = await ctx.db.$queryRaw<
            {
              path: string;
              app_path: string;
              permalink: string | null;
              metadata: PageMetadata | null;
            }[]
          >`
              SELECT "path", "app_path", "permalink", "metadata"
              FROM "Blob"
              WHERE "site_id" = ${site.id}
                AND "path" LIKE ${dir + '%'}
                AND "path" !~ ${dirReadmePattern}
                AND "path" !~ ${dirIndexPattern}
                AND "extension" IN ('md', 'mdx')
              ORDER BY
                ("metadata"->>'date')::timestamp DESC NULLS LAST,
                "metadata"->>'title' ASC NULLS LAST
          `;

          const items = blobs.map((blob) => {
            const metadata = blob.metadata as PageMetadata | null;
            const mediaFrontmatterField = input.slots.media ?? 'image';

            if (metadata?.[mediaFrontmatterField]) {
              let value = metadata[mediaFrontmatterField];
              if (isWikiLink(value)) {
                value = resolveWikiLinkToFilePath({
                  wikiLink: value,
                  filePaths: siteFilePaths,
                });
              }
              metadata[mediaFrontmatterField] = resolveFilePathToUrlPath({
                target: value,
                siteHostname,
              });
            }

            // Use permalink if available, otherwise use app_path
            const pathToUse = blob.permalink || blob.app_path;
            return {
              url: `/${pathToUse}`,
              metadata,
            };
          });

          return {
            items,
          };
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${site.id}`, `${site.id}-${input.dir}-catalog`],
        },
      )(input);
    }),
  getBlob: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        slug: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const siteForAccess = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        select: { privacyMode: true, tokenVersion: true, userId: true },
      });
      await assertSiteAccess(siteForAccess, input.siteId, ctx);

      return await unstable_cache(
        async (input) => {
          // Try to find by permalink first, then fallback to appPath
          let blob = await ctx.db.blob.findFirst({
            where: {
              siteId: input.siteId,
              permalink: input.slug,
            },
            orderBy: { path: 'desc' },
          });

          // If not found by permalink, try appPath.
          // When both index.md and README.md exist in the same directory they
          // share the same appPath.  We prefer index.* over README.* (matching
          // the convention of most static-site generators), so fetch all
          // candidates and pick deterministically.
          if (!blob) {
            const candidates = await ctx.db.blob.findMany({
              where: {
                siteId: input.siteId,
                appPath: input.slug,
              },
            });
            if (candidates.length === 1) {
              blob = candidates[0]!;
            } else if (candidates.length > 1) {
              blob =
                candidates.find((b) => /(?:^|\/)index\.mdx?$/.test(b.path)) ??
                candidates[0]!;
            }
          }

          // Home page fallback resolution order (when no appPath="/" blob exists):
          // 2. index.html — strong HTML convention, beats arbitrary md fallback
          if (!blob && input.slug === '/') {
            blob = await ctx.db.blob.findFirst({
              where: { siteId: input.siteId, path: 'index.html' },
            });
          }

          // 3. First md/mdx — sort by appPath (nulls last), then path as tiebreaker
          if (!blob && input.slug === '/') {
            blob = await ctx.db.blob.findFirst({
              where: {
                siteId: input.siteId,
                extension: { in: ['md', 'mdx'] },
              },
              orderBy: [
                { appPath: { sort: 'asc', nulls: 'last' } },
                { path: 'asc' },
              ],
            });
          }

          // 4. First html file — sort by path
          if (!blob && input.slug === '/') {
            blob = await ctx.db.blob.findFirst({
              where: { siteId: input.siteId, extension: 'html' },
              orderBy: { path: 'asc' },
            });
          }

          const site = await ctx.db.site.findFirst({
            where: {
              id: input.siteId,
            },
            include: { user: true },
          });

          if (!blob || !site) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Page not found',
            });
          }

          const siteHostname =
            site.customDomain ??
            `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

          const metadata = blob.metadata as PageMetadata | null;
          const siteFilePaths = (
            await ctx.db.blob.findMany({
              where: {
                siteId: input.siteId,
              },
              select: {
                path: true,
              },
            })
          ).map((b) => b.path);

          ['image', 'avatar'].forEach((key) => {
            if (metadata?.[key]) {
              let value = metadata[key];

              if (isWikiLink(value)) {
                value = resolveWikiLinkToFilePath({
                  wikiLink: value,
                  filePaths: siteFilePaths,
                });
              }

              metadata[key] = resolveFilePathToUrlPath({
                target: value,
                siteHostname,
              });
            }
          });

          if (metadata?.cta) {
            metadata?.cta.forEach((c) => {
              let value = c.href;
              if (isWikiLink(value)) {
                value = resolveWikiLinkToFilePath({
                  wikiLink: value,
                  filePaths: siteFilePaths,
                });
              }
              c.href = resolveFilePathToUrlPath({
                target: value,
                siteHostname,
              });
            });
          }

          if (
            metadata?.hero &&
            typeof metadata.hero === 'object' &&
            !Array.isArray(metadata.hero)
          ) {
            if (typeof metadata.hero.image === 'string') {
              let value = metadata.hero.image;

              if (isWikiLink(value)) {
                value = resolveWikiLinkToFilePath({
                  wikiLink: value,
                  filePaths: siteFilePaths,
                });
              }

              metadata.hero.image = resolveFilePathToUrlPath({
                target: value,
                siteHostname,
              });
            }

            if (Array.isArray(metadata.hero.cta)) {
              metadata.hero.cta.forEach((c) => {
                let value = c.href;
                if (isWikiLink(value)) {
                  value = resolveWikiLinkToFilePath({
                    wikiLink: value,
                    filePaths: siteFilePaths,
                  });
                }
                c.href = resolveFilePathToUrlPath({
                  target: value,
                  siteHostname,
                });
              });
            }
          }

          return blob;
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-${input.slug}`],
        },
      )(input);
    }),
  getBlobByPath: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        path: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const siteForAccess = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        select: { privacyMode: true, tokenVersion: true, userId: true },
      });
      await assertSiteAccess(siteForAccess, input.siteId, ctx);

      return await unstable_cache(
        async (input) => {
          const blob = await ctx.db.blob.findFirst({
            where: {
              siteId: input.siteId,
              path: input.path,
            },
            orderBy: { path: 'desc' },
          });

          if (!blob) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Blob not found',
            });
          }

          return blob;
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-${input.path}`],
        },
      )(input);
    }),
  getBlobContent: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      // First fetch the blob to get its siteId for proper cache tagging
      const blobForTags = await ctx.db.blob.findFirst({
        where: { id: input.id },
        select: {
          siteId: true,
          site: {
            select: { privacyMode: true, tokenVersion: true, userId: true },
          },
        },
      });

      if (!blobForTags) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Page not found',
        });
      }

      await assertSiteAccess(blobForTags.site, blobForTags.siteId, ctx);

      return await unstable_cache(
        async (input) => {
          const blob = await ctx.db.blob.findFirst({
            where: {
              id: input.id,
            },
            orderBy: { path: 'desc' },
            include: {
              site: true,
            },
          });

          if (!blob) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Page not found',
            });
          }

          const content = await fetchFile({
            projectId: blob.site.id,
            path: blob.path,
          });

          return content;
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${blobForTags.siteId}`, `${input.id}`],
        },
      )(input);
    }),
  getAuthors: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        authors: z.array(z.string().min(1)),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<
        Array<{
          key: string;
          name: string;
          url: string | null;
          avatar?: string;
        }>
      > => {
        return await unstable_cache(
          async (input) => {
            const site = await ctx.db.site.findUnique({
              where: { id: input.siteId },
              include: { user: true },
            });

            if (!site) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Site not found',
              });
            }

            const siteHostname =
              site.customDomain ??
              `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

            const siteFilePaths = (
              await ctx.db.blob.findMany({
                where: {
                  siteId: input.siteId,
                },
                select: {
                  path: true,
                },
              })
            ).map((b) => b.path);

            const authorsPromises = input.authors.map(
              async (author: string) => {
                let authorPath = author;
                if (isWikiLink(authorPath)) {
                  authorPath = getWikiLinkValue(authorPath);
                }
                const authorBlob = await ctx.db.blob.findFirst({
                  where: {
                    siteId: input.siteId,
                    OR: [
                      { path: { endsWith: authorPath + '.md' } },
                      { path: { endsWith: authorPath + '.mdx' } },
                    ],
                  },
                });

                if (!authorBlob) {
                  // Return author with name but no URL if no profile page exists
                  return {
                    key: author,
                    name: author,
                    url: null,
                  };
                }

                const metadata = authorBlob.metadata as PageMetadata | null;

                // Use permalink if available, otherwise use appPath
                const pathToUse = authorBlob.permalink || authorBlob.appPath;
                const url = site.customDomain
                  ? `/${pathToUse}`
                  : `/@${site.user?.username}/${site.projectName}/${pathToUse}`;

                if (metadata?.avatar) {
                  let value = metadata.avatar;
                  if (isWikiLink(metadata.avatar)) {
                    value = resolveWikiLinkToFilePath({
                      wikiLink: value,
                      filePaths: siteFilePaths,
                    });
                  }
                  metadata.avatar = resolveFilePathToUrlPath({
                    target: value,
                    siteHostname,
                  });
                }

                return {
                  key: authorBlob.id,
                  name: metadata?.title ?? author,
                  avatar: metadata?.avatar,
                  url,
                };
              },
            );

            const authors = await Promise.all(authorsPromises);

            return authors;
          },
          undefined,
          {
            revalidate: 60,
            tags: [`${input.siteId}`, `${input.siteId}-authors`],
          },
        )(input);
      },
    ),
  getPermalinksMapping: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
      }),
    )
    .output(z.record(z.string(), z.string()))
    .query(async ({ ctx, input }): Promise<Record<string, string>> => {
      return await unstable_cache(
        async (input) => {
          const site = await ctx.db.site.findUnique({
            where: { id: input.siteId },
            include: { user: true },
          });

          if (!site) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Site not found',
            });
          }

          const siteHostname =
            site.customDomain ??
            `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

          const blobs = await ctx.db.blob.findMany({
            where: {
              siteId: input.siteId,
              permalink: { not: null },
            },
            select: {
              path: true,
              permalink: true,
            },
          });

          // Create a mapping of file paths to permalinks
          const mapping: Record<string, string> = {};
          for (const blob of blobs) {
            if (blob.permalink) {
              // TODO prepend paths
              const path = '/' + blob.path;
              let url = blob.permalink.replace(/^\//, '');
              url = `/${url}`;

              mapping[path] = url;
            }
          }

          return mapping;
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-permalinks-mapping`],
        },
      )(input);
    }),
  getPermalinks: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
      }),
    )
    .output(z.array(z.string()))
    .query(async ({ ctx, input }): Promise<string[]> => {
      return await unstable_cache(
        async (input) => {
          const site = await ctx.db.site.findUnique({
            where: { id: input.siteId },
            include: {
              user: true,
            },
          });

          if (!site) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Site not found',
            });
          }

          const blobs = await ctx.db.blob.findMany({
            where: {
              siteId: site.id,
            },
            select: {
              path: true,
              appPath: true,
            },
          });

          const permalinks = blobs.map((blob) => {
            let prefix: string;
            if (site.customDomain) {
              prefix = '';
            } else {
              prefix = `/@${site.user?.username}/${site.projectName}`;
            }

            return (
              (blob.appPath
                ? prefix + (blob.appPath === '/' ? '' : '/' + blob.appPath)
                : prefix + '/' + blob.path) || '/'
            );
          });

          return permalinks;
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-permalinks`],
        },
      )(input);
    }),
  getAllBlobPaths: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
      }),
    )
    .output(z.array(z.string()))
    .query(async ({ ctx, input }): Promise<string[]> => {
      return await unstable_cache(
        async (input) => {
          const site = await ctx.db.site.findUnique({
            where: { id: input.siteId },
          });

          if (!site) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Site not found',
            });
          }

          const blobs = await ctx.db.blob.findMany({
            where: {
              siteId: input.siteId,
            },
            select: {
              path: true,
            },
            orderBy: {
              path: 'asc',
            },
          });

          return blobs.map((blob) => '/' + blob.path); // TODO prepend paths in the db with leading slash
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-blob-paths`],
        },
      )(input);
    }),
  getImageDimensionsMap: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async (input) => {
          const blobs = await ctx.db.blob.findMany({
            where: {
              siteId: input.siteId,
              width: { not: null },
              height: { not: null },
            },
            select: {
              path: true,
              width: true,
              height: true,
            },
          });

          const map: Record<string, { width: number; height: number }> = {};
          for (const blob of blobs) {
            if (blob.width != null && blob.height != null) {
              map[`/${blob.path}`] = {
                width: blob.width,
                height: blob.height,
              };
            }
          }
          return map;
        },
        undefined,
        {
          revalidate: 60,
          tags: [`${input.siteId}`, `${input.siteId}-image-dimensions`],
        },
      )(input);
    }),
  disconnectGitHub: protectedProcedure
    .input(z.object({ siteId: z.string().min(1) }))
    .output(publicSiteSchema)
    .mutation(async ({ ctx, input }): Promise<PublicSite> => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      if (!site.ghRepository && !site.installationRepositoryId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Site is not connected to a GitHub repository',
        });
      }

      // Clear all GitHub-related fields
      await ctx.db.site.update({
        where: { id: input.siteId },
        data: {
          ghRepository: null,
          ghBranch: null,
          rootDir: null,
          installationRepositoryId: null,
          autoSync: false,
          tree: Prisma.JsonNull,
        },
      });

      // Analytics
      const posthog = PostHogClient();
      posthog.capture({
        distinctId: site.userId,
        event: 'site_github_disconnected',
        properties: { id: site.id },
      });
      await posthog.shutdown();

      const fresh = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        select: publicSiteSelect,
      });

      if (!fresh) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found after update',
        });
      }

      revalidateTag(`${site.id}`);
      return fresh;
    }),
  reconnectSiteToGitHubApp: protectedProcedure
    .input(z.object({ siteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      if (site.installationRepositoryId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Site already has GitHub App access',
        });
      }

      if (!site.ghRepository) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Site has no known repository to reconnect',
        });
      }

      const repoRecord = await ctx.db.gitHubInstallationRepository.findFirst({
        where: {
          installation: { userId: site.userId },
          repositoryFullName: site.ghRepository,
        },
        select: { id: true },
      });

      if (!repoRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No GitHub App installation found with access to ${site.ghRepository}. Grant access to this repository and try again.`,
        });
      }

      const fresh = await ctx.db.site.update({
        where: { id: input.siteId },
        data: {
          installationRepositoryId: repoRecord.id,
          autoSync: true,
        },
        select: publicSiteSelect,
      });

      return fresh;
    }),
  connectGitHub: protectedProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        ghRepository: z.string().min(1),
        ghBranch: z.string().min(1),
        rootDir: z.string().optional(),
        installationId: z.string().optional(),
      }),
    )
    .output(publicSiteSchema)
    .mutation(async ({ ctx, input }): Promise<PublicSite> => {
      const { siteId, ghRepository, ghBranch, rootDir, installationId } = input;

      const site = await ctx.db.site.findUnique({
        where: { id: siteId },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      if (site.ghRepository) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Site is already connected to a GitHub repository. Disconnect first before connecting to a new repository.',
        });
      }

      // Look up the GitHubInstallationRepository record for this repo,
      // verifying that the installation belongs to the calling user so that
      // a caller cannot use another user's installation token.
      let installationRepoId: string | null = null;
      let verifiedInstallationId: string | undefined;
      if (installationId) {
        const repoRecord = await ctx.db.gitHubInstallationRepository.findFirst({
          where: {
            installationId,
            repositoryFullName: ghRepository,
            installation: { userId: ctx.session.user.id },
          },
          select: { id: true },
        });
        if (repoRecord) {
          installationRepoId = repoRecord.id;
          verifiedInstallationId = installationId;
        }
      }

      // Validate remote branch exists
      const branchExists = await checkIfBranchExists({
        ghRepository,
        ghBranch,
        accessToken: ctx.session.accessToken,
        installationId: verifiedInstallationId,
      });

      if (!branchExists) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Branch ${ghBranch} does not exist in repository ${ghRepository}`,
        });
      }

      // Update site with GitHub connection
      await ctx.db.site.update({
        where: { id: siteId },
        data: {
          ghRepository,
          ghBranch,
          rootDir: rootDir || null,
          autoSync: true,
          ...(installationRepoId && {
            installationRepository: { connect: { id: installationRepoId } },
          }),
        },
      });

      // Trigger initial sync
      await inngest.send({
        name: 'site/sync',
        data: {
          siteId,
          ghRepository,
          ghBranch,
          rootDir: rootDir || null,
          accessToken: ctx.session.accessToken,
          installationId: verifiedInstallationId,
        },
      });

      // Analytics
      const posthog = PostHogClient();
      posthog.capture({
        distinctId: site.userId,
        event: 'site_github_connected',
        properties: { id: site.id, ghRepository },
      });
      await posthog.shutdown();

      const fresh = await ctx.db.site.findUnique({
        where: { id: siteId },
        select: publicSiteSelect,
      });

      if (!fresh) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found after update',
        });
      }

      revalidateTag(`${site.id}`);
      return fresh;
    }),
  publishFiles: protectedProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        files: z.array(
          z.object({
            path: z.string().min(1),
            size: z.number(),
            sha: z.string().min(1),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { siteId, files } = input;

      const site = await ctx.db.site.findUnique({
        where: { id: siteId },
        select: { id: true, userId: true },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      const MAX_FILES = 1000;
      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      const MAX_TOTAL_SIZE = 500 * 1024 * 1024;

      if (files.length > MAX_FILES) {
        throw new TRPCError({
          code: 'PAYLOAD_TOO_LARGE',
          message: `Maximum ${MAX_FILES} files per request`,
        });
      }

      let totalSize = 0;
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          throw new TRPCError({
            code: 'PAYLOAD_TOO_LARGE',
            message: `File ${file.path} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          });
        }
        totalSize += file.size;
      }

      if (totalSize > MAX_TOTAL_SIZE) {
        throw new TRPCError({
          code: 'PAYLOAD_TOO_LARGE',
          message: `Total upload size exceeds maximum of ${MAX_TOTAL_SIZE / 1024 / 1024}MB`,
        });
      }

      let uploadUrls: {
        path: string;
        uploadUrl: string;
        blobId: string;
        contentType: string;
      }[];
      try {
        uploadUrls = await Promise.all(
          files.map(async (file) => {
            const extension = file.path.split('.').pop()?.toLowerCase() || '';

            const urlPath = (() => {
              if (['md', 'mdx'].includes(extension)) {
                const _urlPath = resolveFilePathToUrlPath({
                  target: file.path,
                });
                return _urlPath === '/'
                  ? _urlPath
                  : _urlPath.replace(/^\//, '');
              }
              return null;
            })();

            const blob = await ctx.db.blob.upsert({
              where: {
                siteId_path: { siteId, path: file.path },
              },
              create: {
                siteId,
                path: file.path,
                appPath: urlPath,
                size: file.size,
                sha: file.sha,
                metadata: {},
                extension,
                syncStatus: 'UPLOADING',
              },
              update: {
                size: file.size,
                sha: file.sha,
                appPath: urlPath,
                extension,
                syncStatus: 'UPLOADING',
              },
            });

            const s3Key = `${siteId}/main/raw/${file.path}`;
            const contentType = getContentType(extension);
            const uploadUrl = await generatePresignedUploadUrl(
              s3Key,
              3600,
              contentType,
            );

            return {
              path: file.path,
              uploadUrl,
              blobId: blob.id,
              contentType,
            };
          }),
        );
      } finally {
        revalidateTag(siteId);
      }

      const posthog = await PostHogClient();
      posthog.capture({
        distinctId: ctx.session.user.id,
        event: 'content_published',
        properties: {
          publish_method: 'drag_drop_dashboard',
          site_id: siteId,
        },
      });
      await posthog.shutdown();

      return { files: uploadUrls };
    }),
});

// ---- Util: ensure unique project name per user ----
async function ensureUniqueProjectName(
  prisma: PrismaClient,
  userId: string,
  base: string,
) {
  let name = base;
  let n = 2;
  // Small cap to avoid pathological loops; unique constraint is the real backstop.
  while (
    await prisma.site.findFirst({
      where: { projectName: name, userId },
      select: { id: true },
    })
  ) {
    name = `${base}-${n}`;
    n++;
  }
  return name;
}
