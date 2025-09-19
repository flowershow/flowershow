import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { inngest } from "@/inngest/client";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  fetchGitHubRepoTree,
  checkIfBranchExists,
  createGitHubRepoWebhook,
  deleteGitHubRepoWebhook,
} from "@/lib/github";
import { deleteProject, fetchFile } from "@/lib/content-store";
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from "@/lib/domains";
import { TRPCError } from "@trpc/server";
import { buildSiteTree } from "@/lib/build-site-tree";
import { SiteConfig } from "@/components/types";
import { env } from "@/env.mjs";
import { Blob, Plan, PrismaClient, PrivacyMode, Status } from "@prisma/client";
import { PageMetadata } from "../types";
import { resolveLinkToUrl } from "@/lib/resolve-link";
import { getSiteUrlPath } from "@/lib/get-site-url";
import { Prisma } from "@prisma/client";
import PostHogClient from "@/lib/server-posthog";

const asciiPrintableNoEdgeSpaces = new RegExp(
  "^(?=.{8,128}$)[!-~](?:[ -~]*[!-~])?$",
);

const publicSiteSelect = Prisma.validator<Prisma.SiteSelect>()({
  id: true,
  ghRepository: true,
  ghBranch: true,
  projectName: true,
  customDomain: true,
  rootDir: true,
  plan: true,
  enableComments: true,
  giscusRepoId: true,
  giscusCategoryId: true,
  enableSearch: true,
  privacyMode: true,
  autoSync: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { ghUsername: true } },
});

export type PublicSite = Prisma.SiteGetPayload<{
  select: typeof publicSiteSelect;
}>;

const publicSiteSchema: z.ZodType<PublicSite> = z.object({
  id: z.string(),
  ghRepository: z.string(),
  ghBranch: z.string(),
  projectName: z.string(),
  customDomain: z.string().nullable(),
  rootDir: z.string().nullable(),
  plan: z.enum(Plan),
  enableComments: z.boolean(),
  giscusRepoId: z.string().nullable(),
  giscusCategoryId: z.string().nullable(),
  enableSearch: z.boolean(),
  privacyMode: z.enum(PrivacyMode),
  autoSync: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: z.object({ ghUsername: z.string() }),
});

export enum SiteUpdateKey {
  customDomain = "customDomain",
  rootDir = "rootDir",
  autoSync = "autoSync",
  enableComments = "enableComments",
  enableSearch = "enableSearch",
  subdomain = "subdomain",
  projectName = "projectName",
}

/* eslint-disable */
export const siteRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        ghUsername: z.string().min(1),
        projectName: z.string().min(1),
      }),
    )
    .output(publicSiteSchema.nullable())
    .query(async ({ ctx, input }): Promise<PublicSite | null> => {
      return ctx.db.site.findFirst({
        where: {
          AND: [
            { projectName: input.projectName },
            { user: { ghUsername: input.ghUsername } },
          ],
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
  getAll: protectedProcedure
    .output(z.array(publicSiteSchema))
    .query(async ({ ctx }): Promise<PublicSite[]> => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
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
      }),
    )
    .output(publicSiteSchema)
    .mutation(async ({ ctx, input }): Promise<PublicSite> => {
      const { ghRepository, ghBranch, rootDir } = input;
      const accessToken = ctx.session.accessToken;

      // 1) Validate remote branch exists
      const branchExists = await checkIfBranchExists({
        ghRepository,
        ghBranch,
        accessToken,
      });

      if (!branchExists) {
        throw new Error(
          `Branch ${ghBranch} does not exist in repository ${ghRepository}`,
        );
      }

      // 2) Decide projectName (unique per user)
      const repoName = ghRepository.split("/")[1]!;
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
          autoSync: false,
          webhookId: null,
          user: { connect: { id: ctx.session.user.id } },
        },
      });

      // 4) Try to create webhook; if it works, mark autoSync on
      let webhookId: string | null = null;
      try {
        const response = await createGitHubRepoWebhook({
          ghRepository,
          accessToken,
          webhookUrl: `${env.GH_WEBHOOK_URL}?siteid=${created.id}`,
        });
        webhookId = response.id.toString();

        // update site to enable autoSync
        await ctx.db.site.update({
          where: { id: created.id },
          data: { autoSync: true, webhookId },
        });
      } catch (e) {
        console.error("Failed to create webhook", e);
      }

      // 5) Kick off initial sync
      await inngest.send({
        name: "site/sync",
        data: {
          siteId: created.id,
          ghRepository,
          ghBranch,
          rootDir: created.rootDir,
          accessToken,
          initialSync: true,
        },
      });

      // 6) Analytics (best-effort)
      const posthog = await PostHogClient();
      posthog.capture({
        distinctId: created.userId,
        event: "site_created",
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
        throw new Error("Site not found after creation");
      }

      console.log({ fresh });

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
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      // Utils
      const parseIfBoolString = (v: string) =>
        v === "true" ? true : v === "false" ? false : v;
      const toNullIfEmpty = (v: string) => (v.trim() === "" ? null : v.trim());

      if (key === "customDomain") {
        const newDomain = toNullIfEmpty(value);
        if (!newDomain) {
          await ctx.db.site.update({
            where: { id },
            data: { customDomain: null },
            select: publicSiteSelect,
          });
        } else {
          if (env.NEXT_PUBLIC_VERCEL_ENV === "production") {
            if (!validDomainRegex.test(newDomain)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Invalid domain",
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
      } else if (key === "rootDir") {
        const newRoot = toNullIfEmpty(value);

        await ctx.db.site.update({
          where: { id },
          data: { rootDir: newRoot },
        });
        await deleteProject(id).catch(() => {}); // TODO handle it in a better way
        await inngest.send({
          name: "site/sync",
          data: {
            siteId: id,
            ghRepository: site.ghRepository,
            ghBranch: site.ghBranch,
            rootDir: newRoot,
            accessToken: ctx.session.accessToken,
            initialSync: true,
          },
        });
      } else if (key === "autoSync") {
        const enable = value === "true";

        if (enable) {
          try {
            const { id: webhookId } = await createGitHubRepoWebhook({
              ghRepository: site.ghRepository,
              accessToken: ctx.session.accessToken,
              webhookUrl: `${env.GH_WEBHOOK_URL}?siteid=${site.id}`, // Add site ID to webhook URL
            });
            await ctx.db.site.update({
              where: { id },
              data: { autoSync: true, webhookId: webhookId.toString() },
            });
          } catch {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Failed to create webhook. Check if the repository already has a webhook installed.",
            });
          }
        } else {
          try {
            if (site.webhookId) {
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
              code: "BAD_REQUEST",
              message: `Failed to delete webhook: ${String(error)}`,
            });
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
        if (key === "enableSearch" && converted === true) {
          await inngest.send({
            name: "site/sync",
            data: {
              siteId: id,
              ghRepository: site.ghRepository,
              ghBranch: site.ghBranch,
              rootDir: site.rootDir,
              accessToken: ctx.session.accessToken,
              forceSync: true,
            },
          });
        }
      }

      // Analytics (best-effort)
      const posthog = PostHogClient();
      posthog.capture({
        distinctId: site.userId,
        event: "site_settings_changed",
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
          code: "NOT_FOUND",
          message: "Site not found after update",
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
              "Password must be 8–128 printable characters with no leading/trailing spaces.",
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
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      if (input.enabled) {
        if (!input.password) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You need to provide a password to set",
          });
        } else {
          const hash = await bcrypt.hash(input.password, 12);
          await ctx.db.site.update({
            where: { id: input.id },
            data: {
              privacyMode: "PASSWORD",
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
            privacyMode: "PUBLIC",
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
          code: "NOT_FOUND",
          message: "Site not found after update",
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
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      if (site.webhookId) {
        try {
          await deleteGitHubRepoWebhook({
            ghRepository: site.ghRepository,
            webhook_id: Number(site.webhookId),
            accessToken: ctx.session.accessToken,
          });
        } catch (error) {
          console.error("Failed to delete webhook", error);
        }
      }

      await ctx.db.site.delete({
        where: { id: site.id },
      });

      await inngest.send({
        name: "site/delete",
        data: {
          siteId: site.id,
          accessToken: ctx.session.accessToken,
        },
      });

      const posthog = PostHogClient();
      posthog.capture({
        distinctId: site.userId,
        event: "site_deleted",
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

      if (!site || site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      const { id, ghRepository, ghBranch } = site;
      const accessToken = ctx.session.accessToken;

      await inngest.send({
        name: "site/sync",
        data: {
          siteId: id,
          ghRepository,
          ghBranch,
          rootDir: site.rootDir,
          accessToken,
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
        status: Status | "OUTDATED";
        error?: string | null;
        lastSyncedAt?: Date | null;
      }> => {
        // Get site data for tree comparison
        const site = await ctx.db.site.findUnique({
          where: { id: input.id },
        });

        if (!site || site.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Site not found",
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
        let status: Status | "OUTDATED";
        let error: string | null = null;
        // Get the most recent update date
        const lastSyncedAt =
          blobs
            .map((b) => b.updatedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0] || null;

        // If any blob is PENDING, site sync is PENDING
        if (blobs.some((b) => b.syncStatus === "PENDING")) {
          status = "PENDING";
        }
        // If any blob is ERROR, site is ERROR
        else if (blobs.some((b) => b.syncStatus === "ERROR")) {
          status = "ERROR";
          error = blobs
            .filter((b) => b.syncStatus === "ERROR")
            .map((b) =>
              b.syncError
                ? `[${b.path}]: ${b.syncError}`
                : `[${b.path}]: Unknown error`,
            )
            .join("\n");
        }
        // Otherwise, compare trees
        else {
          if (!site.tree) {
            return {
              status: "PENDING",
            };
          }
          const gitHubTree = await fetchGitHubRepoTree({
            ghRepository: site.ghRepository,
            ghBranch: site.ghBranch,
            accessToken: ctx.session.accessToken,
          });
          status =
            site.tree?.["sha"] === gitHubTree.sha ? "SUCCESS" : "OUTDATED";
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
              code: "NOT_FOUND",
              message: "Site not found",
            });
          }

          try {
            return await fetchFile({
              projectId: site.id,
              branch: site.ghBranch,
              path: "custom.css",
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
          });

          if (!site) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Site not found",
            });
          }

          try {
            const config = await fetchFile({
              projectId: site.id,
              branch: site.ghBranch,
              path: "config.json",
            });
            // TODO is casting to SiteConfig safe?
            return config ? (JSON.parse(config) as SiteConfig) : null;
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
        orderBy: z.enum(["path", "title"]).default("title"),
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
              code: "NOT_FOUND",
              message: "Site not found",
            });
          }

          const sitePrefix = getSiteUrlPath(site);

          // Get all blobs for the site
          const blobs = (await ctx.db.blob.findMany({
            where: {
              siteId: site.id,
              extension: { in: ["md", "mdx"] },
              metadata: { not: Prisma.AnyNull }, // metadata must exist
              OR: [
                { metadata: { path: ["publish"], equals: true } }, // explicitly published
                { metadata: { path: ["publish"], equals: Prisma.AnyNull } }, // no publish field
              ],
            },
            select: {
              path: true,
              appPath: true,
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

  getPermalinks: publicProcedure
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
              projectName: true,
              user: true,
              customDomain: true,
            },
          });

          if (!site) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Site not found",
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

          return blobs.map((blob) => {
            let prefix: string;
            if (site.customDomain) {
              prefix = "";
            } else {
              prefix = `/@${site.user.ghUsername}/${site.projectName}`;
            }

            return (
              (blob.appPath
                ? prefix + (blob.appPath === "/" ? "" : "/" + blob.appPath)
                : prefix + "/_r/-/" + blob.path) || "/"
            );
          });
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-permalinks`],
        },
      )(input);
    }),
  getCatalogFiles: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        dir: z.string().min(1), // absolute dir
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
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      return await unstable_cache(
        async (input) => {
          const dir = input.dir.replace(/^\//, "");
          const dirReadmePath = dir + "/README.md";
          const dirIndexPath = dir + "/index.md";

          const blobs = await ctx.db.$queryRaw<
            { path: string; app_path: string; metadata: PageMetadata | null }[]
          >`
              SELECT "path", "app_path", "metadata"
              FROM "Blob"
              WHERE "site_id" = ${site.id}
                AND "path" LIKE ${dir + "%"}
                AND "path" NOT IN (${dirReadmePath}, ${dirIndexPath})
                AND "extension" IN ('md', 'mdx')
              ORDER BY
                ("metadata"->>'date')::timestamp DESC NULLS LAST,
                "metadata"->>'title' ASC NULLS LAST
          `;

          const sitePrefix = getSiteUrlPath(site);

          const items = blobs.map((b) => {
            const metadata = b.metadata;

            const mediaFrontmatterField = input.slots.media ?? "image";

            if (metadata?.[mediaFrontmatterField]) {
              metadata[mediaFrontmatterField] = resolveLinkToUrl({
                target: metadata[mediaFrontmatterField],
                originFilePath: b.path,
                prefix: sitePrefix,
                isSrcLink: true,
                domain: site.customDomain,
              });
            }

            return {
              url: resolveLinkToUrl({
                target: b.app_path,
                prefix: sitePrefix,
              }),
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
          const blob = await ctx.db.blob.findFirst({
            where: {
              siteId: input.siteId,
              appPath: input.slug,
            },
            orderBy: { path: "desc" },
          });

          if (!blob) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Page not found",
            });
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
  getBlobWithContent: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        slug: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async (input) => {
          const blob = await ctx.db.blob.findFirst({
            where: {
              siteId: input.siteId,
              appPath: input.slug,
            },
            orderBy: { path: "desc" },
            include: {
              site: true,
            },
          });

          if (!blob) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Page not found",
            });
          }

          const content = await fetchFile({
            projectId: input.siteId,
            branch: blob.site.ghBranch,
            path: blob.path,
          });

          return { content, blob };
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}`, `${input.siteId}-${input.slug}`],
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
              select: {
                user: true,
                projectName: true,
                customDomain: true,
              },
            });

            if (!site) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Site not found",
              });
            }

            const authorsPromises = input.authors.map(async (author) => {
              const blob = await ctx.db.blob.findFirst({
                where: {
                  siteId: input.siteId,
                  OR: [
                    { path: { endsWith: author + ".md" } },
                    { path: { endsWith: author + ".mdx" } },
                  ],
                },
              });

              const metadata = blob?.metadata as
                | PageMetadata
                | null
                | undefined;

              const url = !blob?.appPath
                ? null
                : site.customDomain
                  ? `/${blob.appPath}`
                  : `/@${site.user.ghUsername}/${site.projectName}/${blob.appPath}`;

              let avatar;

              if (metadata?.avatar) {
                if (metadata.avatar.startsWith("http")) {
                  avatar = metadata.avatar;
                } else {
                  // TODO make it work for relative paths too
                  avatar = site.customDomain
                    ? `/_r/-${metadata.avatar}`
                    : `/@${site.user.ghUsername}/${site.projectName}` +
                      `/_r/-${metadata.avatar}`;
                }
              }

              return {
                key: author,
                name: metadata?.title ?? author,
                avatar,
                url,
              };
            });

            return await Promise.all(authorsPromises);
          },
          undefined,
          {
            revalidate: 60,
            tags: [`${input.siteId}`, `${input.siteId}-authors`],
          },
        )(input);
      },
    ),
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
