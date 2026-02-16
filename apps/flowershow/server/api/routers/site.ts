import { Blob, Prisma, PrismaClient, Status } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { revalidateTag, unstable_cache } from 'next/cache';
import { z } from 'zod';
import { isNavDropdown, SiteConfig } from '@/components/types';
import { env } from '@/env.mjs';
import { inngest } from '@/inngest/client';
import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';
import { buildSiteTree } from '@/lib/build-site-tree';
import { deleteProject, fetchFile } from '@/lib/content-store';
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from '@/lib/domains';
import { getSiteUrlPath } from '@/lib/get-site-url';
import {
  checkIfBranchExists,
  createGitHubRepoWebhook,
  deleteGitHubRepoWebhook,
  fetchGitHubRepoTree,
} from '@/lib/github';
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
import {
  PageMetadata,
  PublicSite,
  publicSiteSchema,
  publicSiteSelect,
  SiteUpdateKey,
} from '../types';

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
        ghRepository: z.string().min(1),
        ghBranch: z.string().min(1),
        rootDir: z.string().optional(),
        projectName: z.string().optional(),
        installationId: z.string().optional(), // GitHub App installation ID
      }),
    )
    .output(publicSiteSchema)
    .mutation(async ({ ctx, input }): Promise<PublicSite> => {
      const { ghRepository, ghBranch, rootDir, installationId } = input;
      const accessToken = ctx.session.accessToken;

      // 1) Validate remote branch exists
      const branchExists = await checkIfBranchExists({
        ghRepository,
        ghBranch,
        accessToken,
        installationId,
      });

      if (!branchExists) {
        throw new Error(
          `Branch ${ghBranch} does not exist in repository ${ghRepository}`,
        );
      }

      // 2) Decide projectName (unique per user)
      const repoName = ghRepository.split('/')[1]!;
      const baseName = input.projectName?.trim() || repoName;
      const projectName = await ensureUniqueProjectName(
        ctx.db,
        ctx.session.user.id,
        baseName,
      );

      // 3) Create site
      const created = await ctx.db.site.create({
        data: {
          projectName,
          ghRepository,
          ghBranch,
          rootDir,
          autoSync: true,
          webhookId: null,
          user: { connect: { id: ctx.session.user.id } },
          ...(installationId && {
            installation: { connect: { id: installationId } },
          }),
        },
      });

      // 5) Kick off initial sync
      await inngest.send({
        name: 'site/sync',
        data: {
          siteId: created.id,
          ghRepository,
          ghBranch,
          rootDir: created.rootDir,
          accessToken,
          installationId,
        },
      });

      // 6) Analytics (best-effort)
      const posthog = await PostHogClient();
      posthog.capture({
        distinctId: created.userId!,
        event: 'site_created',
        properties: { id: created.id },
      });
      await posthog.shutdown();

      // 7) Return canonical public shape
      const fresh = await ctx.db.site.findUnique({
        where: { id: created.id },
        select: publicSiteSelect,
      });
      if (!fresh) {
        // extremely unlikely; handle defensively
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
        include: { user: true },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      // Utils
      const parseIfBoolString = (v: string) =>
        v === 'true' ? true : v === 'false' ? false : v;
      const toNullIfEmpty = (v: string) => (v.trim() === '' ? null : v.trim());

      if (key === 'customDomain') {
        const newDomain = toNullIfEmpty(value);
        if (!newDomain) {
          await ctx.db.site.update({
            where: { id },
            data: { customDomain: null },
            select: publicSiteSelect,
          });
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
              addDomainToVercel(`www.${newDomain} `),
            ]);

            // If the site had a different customDomain before, we need to remove it from Vercel
            if (site.customDomain && site.customDomain !== newDomain) {
              await removeDomainFromVercelProject(site.customDomain);
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
        if (site.ghRepository && site.ghBranch) {
          await inngest.send({
            name: 'site/sync',
            data: {
              siteId: id,
              ghRepository: site.ghRepository,
              ghBranch: site.ghBranch,
              rootDir: newRoot,
              accessToken: ctx.session.accessToken,
              installationId: site.installationId ?? undefined,
            },
          });
        }
      } else if (key === 'autoSync') {
        const enable = value === 'true';

        // GitHub App installations don't need per-repository webhooks
        // They receive push events at the installation level
        if (site.installationId) {
          // GitHub App site: simply toggle autoSync
          await ctx.db.site.update({
            where: { id },
            data: { autoSync: enable },
          });
        } else {
          // Legacy OAuth site: manage per-repository webhook
          if (enable && site.ghRepository) {
            try {
              const { id: webhookId } = await createGitHubRepoWebhook({
                ghRepository: site.ghRepository,
                accessToken: ctx.session.accessToken,
                webhookUrl: `${env.GH_WEBHOOK_URL}?siteid=${site.id}`,
              });
              await ctx.db.site.update({
                where: { id },
                data: { autoSync: true, webhookId: webhookId.toString() },
              });
            } catch {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message:
                  'Failed to create webhook. Check if the repository already has a webhook installed.',
              });
            }
          } else {
            try {
              if (site.ghRepository && site.webhookId) {
                await deleteGitHubRepoWebhook({
                  ghRepository: site.ghRepository,
                  accessToken: ctx.session.accessToken,
                  webhook_id: Number(site.webhookId),
                }).catch(() => {});
              }
              await ctx.db.site.update({
                where: { id },
                data: { autoSync: false, webhookId: null },
              });
            } catch (error) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Failed to delete webhook: ${String(error)}`,
              });
            }
          }
        }
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
          site.ghRepository &&
          site.ghBranch &&
          key === 'enableSearch' &&
          converted === true
        ) {
          await inngest.send({
            name: 'site/sync',
            data: {
              siteId: id,
              ghRepository: site.ghRepository,
              ghBranch: site.ghBranch,
              rootDir: site.rootDir,
              accessToken: ctx.session.accessToken,
              installationId: site.installationId ?? undefined,
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
        properties: { id: site.id, config: key },
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

      // Only delete webhook for OAuth sites (GitHub App sites use installation-level webhooks)
      if (site.ghRepository && site.webhookId && !site.installationId) {
        try {
          await deleteGitHubRepoWebhook({
            ghRepository: site.ghRepository,
            webhook_id: Number(site.webhookId),
            accessToken: ctx.session.accessToken,
          });
        } catch (error) {
          console.error('Failed to delete webhook', error);
        }
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
        properties: { id: site.id },
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

      const { id, ghRepository, ghBranch } = site;

      if (!ghRepository || !ghBranch) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Can't sync a site with no GitHub repository connected.",
        });
      }

      const accessToken = ctx.session.accessToken;

      await inngest.send({
        name: 'site/sync',
        data: {
          siteId: id,
          ghRepository,
          ghBranch,
          rootDir: site.rootDir,
          accessToken,
          installationId: site.installationId ?? undefined,
          forceSync: input.force,
        },
      });
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
        status: 'SUCCESS' | 'PENDING' | 'ERROR' | 'OUTDATED';
        error?: string | null;
        lastSyncedAt?: Date | null;
      }> => {
        // Get site data for tree comparison
        const site = await ctx.db.site.findUnique({
          where: { id: input.id },
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
        let status: 'SUCCESS' | 'PENDING' | 'ERROR' | 'OUTDATED';
        let error: string | null = null;
        // Get the most recent update date
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
        } else if (!site.ghRepository) {
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
          const gitHubTree = await fetchGitHubRepoTree({
            ghRepository: site.ghRepository,
            ghBranch: site.ghBranch!,
            accessToken: ctx.session.accessToken,
            installationId: site.installationId ?? undefined,
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
            include: { user: true },
          });

          if (!site) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Site not found',
            });
          }

          const sitePrefix = getSiteUrlPath(site);

          try {
            const configJson = await fetchFile({
              projectId: site.id,
              path: 'config.json',
            });
            const config = configJson
              ? (JSON.parse(configJson) as SiteConfig)
              : null;

            if (!config) return null;

            console.log({ config });

            // Resolve media paths to full URLs
            const keysToResolve = ['image', 'logo', 'favicon', 'thumbnail'];
            keysToResolve.forEach((key) => {
              if (
                key === 'favicon' &&
                config.favicon &&
                isEmoji(config.favicon)
              ) {
                return;
              }

              if (config[key]) {
                config[key] = resolveFilePathToUrlPath({
                  target: config[key],
                  sitePrefix,
                  domain: site.customDomain,
                });
              }
            });

            if (config.nav?.links) {
              config.nav.links.forEach((item) => {
                if (isNavDropdown(item)) {
                  item.links.forEach((link) => {
                    link.href = resolveFilePathToUrlPath({
                      target: link.href,
                      sitePrefix,
                      domain: site.customDomain,
                    });
                  });
                } else {
                  item.href = resolveFilePathToUrlPath({
                    target: item.href,
                    sitePrefix,
                    domain: site.customDomain,
                  });
                }
              });
            }

            if (config.nav?.logo) {
              config.nav.logo = resolveFilePathToUrlPath({
                target: config.nav.logo,
                sitePrefix,
                domain: site.customDomain,
              });
            }

            if (config.nav?.social) {
              config.nav.social.forEach((social) => {
                social.href = resolveFilePathToUrlPath({
                  target: social.href,
                  sitePrefix,
                  domain: site.customDomain,
                });
              });
            }

            if (config.nav?.cta) {
              config.nav.cta.href = resolveFilePathToUrlPath({
                target: config.nav.cta.href,
                sitePrefix,
                domain: site.customDomain,
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
                  sitePrefix,
                  domain: site.customDomain,
                });
              }

              if (Array.isArray(config.hero.cta)) {
                config.hero.cta.forEach((c) => {
                  if (typeof c?.href === 'string') {
                    c.href = resolveFilePathToUrlPath({
                      target: c.href,
                      sitePrefix,
                      domain: site.customDomain,
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
                    sitePrefix,
                    domain: site.customDomain,
                  });
                });
              });
            }

            return config;
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

          const sitePrefix = getSiteUrlPath(site);

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

          return buildSiteTree(blobs, {
            orderBy: input.orderBy,
            prefix: sitePrefix,
          }).children;
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

          const sitePrefix = getSiteUrlPath(site);

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
                sitePrefix,
                domain: site.customDomain,
              });
            }

            // Use permalink if available, otherwise use app_path
            const pathToUse = blob.permalink || blob.app_path;
            return {
              url: `${sitePrefix}/${pathToUse}`,
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

          // If on home page and still no blob found, fall back to first md/mdx file alphabetically
          if (!blob && input.slug === '/') {
            blob = await ctx.db.blob.findFirst({
              where: {
                siteId: input.siteId,
                extension: { in: ['md', 'mdx'] },
              },
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

          const sitePrefix = getSiteUrlPath(site);

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
                sitePrefix,
                domain: site.customDomain,
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
                sitePrefix,
                domain: site.customDomain,
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
                sitePrefix,
                domain: site.customDomain,
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
                  sitePrefix,
                  domain: site.customDomain,
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
        select: { siteId: true },
      });

      if (!blobForTags) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Page not found',
        });
      }

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

            const sitePrefix = getSiteUrlPath(site);

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
                    sitePrefix,
                    domain: site.customDomain,
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

          const sitePrefix = getSiteUrlPath(site);

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
              url = `${sitePrefix}/${url}`;

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
  migrateSiteToGitHubApp: protectedProcedure
    .input(z.object({ siteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        include: { user: true },
      });

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      if (site.installationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Site is already using GitHub App',
        });
      }

      if (!site.ghRepository || !site.ghBranch) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Site doesn't have a GitHub repo connected.",
        });
      }

      // Find matching installation that has access to this repo
      const installation = await ctx.db.gitHubInstallation.findFirst({
        where: {
          userId: site.userId,
          repositories: {
            some: {
              repositoryFullName: site.ghRepository,
            },
          },
        },
        include: { repositories: true },
      });

      if (!installation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No GitHub App installation found with access to ${site.ghRepository}. Please install the GitHub App and grant access to this repository first.`,
        });
      }

      // Update site to use installation
      await ctx.db.site.update({
        where: { id: input.siteId },
        data: { installationId: installation.id },
      });

      // If site had a webhook, it's no longer needed (GitHub App uses installation-level webhooks)
      if (site.webhookId) {
        try {
          await deleteGitHubRepoWebhook({
            ghRepository: site.ghRepository,
            accessToken: ctx.session.accessToken,
            webhook_id: Number(site.webhookId),
          });
        } catch (error) {
          // Best effort - don't fail migration if webhook deletion fails
          console.error('Failed to delete webhook during migration:', error);
        }

        await ctx.db.site.update({
          where: { id: input.siteId },
          data: { webhookId: null },
        });
      }

      // Return updated site
      const fresh = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        select: publicSiteSelect,
      });

      if (!fresh) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found after migration',
        });
      }

      return fresh;
    }),
  batchMigrateSitesToGitHubApp: protectedProcedure
    .input(z.object({ installationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const installation = await ctx.db.gitHubInstallation.findUnique({
        where: { id: input.installationId },
        include: { repositories: true },
      });

      if (!installation || installation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Installation not found',
        });
      }

      // Get all OAuth sites for this user
      const oauthSites = await ctx.db.site.findMany({
        where: {
          userId: ctx.session.user.id,
          installationId: null, // OAuth-only sites
        },
      });

      // Filter sites whose repositories are accessible through this installation
      const accessibleRepoNames = new Set(
        installation.repositories.map((r) => r.repositoryFullName),
      );

      const sitesToMigrate = oauthSites.filter(
        (site) =>
          site.ghRepository && accessibleRepoNames.has(site.ghRepository),
      );

      // Migrate each matching site
      const migratedSites: string[] = [];
      for (const site of sitesToMigrate) {
        try {
          await ctx.db.site.update({
            where: { id: site.id },
            data: { installationId: installation.id },
          });

          // Clean up old webhook if exists
          if (site.ghRepository && site.webhookId) {
            try {
              await deleteGitHubRepoWebhook({
                ghRepository: site.ghRepository,
                accessToken: ctx.session.accessToken,
                webhook_id: Number(site.webhookId),
              });
            } catch (error) {
              console.error('Failed to delete webhook:', error);
            }

            await ctx.db.site.update({
              where: { id: site.id },
              data: { webhookId: null },
            });
          }

          migratedSites.push(site.projectName);
        } catch (error) {
          console.error(`Failed to migrate site ${site.id}:`, error);
        }
      }

      return {
        migratedCount: migratedSites.length,
        migratedSites,
        totalOAuthSites: oauthSites.length,
      };
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

      if (!site.ghRepository) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Site is not connected to a GitHub repository',
        });
      }

      // Delete webhook for OAuth sites (GitHub App sites use installation-level webhooks)
      if (site.webhookId && !site.installationId) {
        try {
          await deleteGitHubRepoWebhook({
            ghRepository: site.ghRepository,
            accessToken: ctx.session.accessToken,
            webhook_id: Number(site.webhookId),
          });
        } catch (error) {
          console.error('Failed to delete webhook during disconnect:', error);
        }
      }

      // Clear all GitHub-related fields
      await ctx.db.site.update({
        where: { id: input.siteId },
        data: {
          ghRepository: null,
          ghBranch: null,
          rootDir: null,
          installationId: null,
          webhookId: null,
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

      // Validate remote branch exists
      const branchExists = await checkIfBranchExists({
        ghRepository,
        ghBranch,
        accessToken: ctx.session.accessToken,
        installationId,
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
          ...(installationId && {
            installation: { connect: { id: installationId } },
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
          installationId,
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
