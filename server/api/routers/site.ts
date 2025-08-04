import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";

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
import { buildSiteMapFromSiteBlobs } from "@/lib/build-site-map";
import { SiteConfig } from "@/components/types";
import { env } from "@/env.mjs";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import { Blob, Status } from "@prisma/client";
import { PageMetadata } from "../types";
import { resolveLink } from "@/lib/resolve-link";
import { SiteWithUser } from "@/types";
import { getSiteUrlPath } from "@/lib/get-site-url";

/* eslint-disable */
export const siteRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        ghUsername: z.string().min(1),
        projectName: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async (input) => {
          return ctx.db.site.findFirst({
            where: {
              AND: [
                { projectName: input.projectName },
                { user: { ghUsername: input.ghUsername } },
              ],
            },
            include: {
              user: {
                select: {
                  ghUsername: true,
                },
              },
            },
          });
        },
        undefined,
        {
          revalidate: 60, // 1 minute
          tags: [
            `${input.ghUsername}-${input.projectName}`,
            `${input.ghUsername}-${input.projectName}-site`,
          ],
        },
      )(input);
    }),
  getByDomain: publicProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async (input) => {
          return await ctx.db.site.findFirst({
            where: {
              customDomain: input.domain,
            },
            include: {
              user: {
                select: {
                  ghUsername: true,
                },
              },
            },
          });
        },
        undefined,
        {
          revalidate: 60, // 1 minute
        },
      )(input);
    }),
  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // don't cache this, it's used in the user dashboard
      return (await ctx.db.site.findFirst({
        where: { id: input.id },
        include: {
          user: true,
        },
      })) as SiteWithUser;
    }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // don't cache this, it's used in the admin panel
    if (ctx.session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }
    return await ctx.db.site.findMany({ include: { user: true } });
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
    .mutation(async ({ ctx, input }) => {
      const { ghRepository, ghBranch, rootDir } = input;
      const accessToken = ctx.session.accessToken;

      // check if branch exists
      const branchExists = await checkIfBranchExists({
        ghRepository,
        ghBranch,
        accessToken,
      });

      if (!branchExists) {
        throw new Error(
          `Branch ${input.ghBranch} does not exist in repository ${input.ghRepository}`,
        );
      }

      //use repository name as an initial project name
      //and append a number if the name is already taken
      let projectName =
        input.projectName ?? (ghRepository.split("/")[1] as string);
      let num = 2;

      while (
        await ctx.db.site.findFirst({
          where: {
            AND: [{ projectName }, { user: { id: ctx.session.user.id } }],
          },
        })
      ) {
        projectName = `${input.ghRepository.split("/")[1]}-${num}`;
        num++;
      }

      // First create site without webhook
      const site = await ctx.db.site.create({
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

      // Then create a webhook that includes site ID in the URL
      let webhookId: string | null = null;
      try {
        const response = await createGitHubRepoWebhook({
          ghRepository,
          accessToken,
          webhookUrl: `${env.GH_WEBHOOK_URL}?siteid=${site.id}`,
        });
        webhookId = response.id.toString();

        // Update site with webhook ID
        await ctx.db.site.update({
          where: { id: site.id },
          data: {
            autoSync: true,
            webhookId,
          },
        });
      } catch (e) {
        console.error("Failed to create webhook", e);
      }

      await inngest.send({
        name: "site/sync",
        data: {
          siteId: site.id,
          ghRepository,
          ghBranch,
          rootDir: site.rootDir,
          accessToken,
          initialSync: true,
        },
      });

      return site;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        key: z.string().min(1),
        value: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, key, value } = input;
      let result;

      const site = await ctx.db.site.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      // Handling custom domain changes
      if (key === "customDomain") {
        if (env.NEXT_PUBLIC_VERCEL_ENV === "production") {
          if (validDomainRegex.test(value)) {
            // Handle adding/updating custom domain
            result = await ctx.db.site.update({
              where: { id },
              data: { customDomain: value },
            });
            await Promise.all([
              addDomainToVercel(value),
              // Optional: add www subdomain as well and redirect to apex domain
              addDomainToVercel(`www.${value} `),
            ]);
          } else if (value === "") {
            // Handle removing custom domain
            result = await ctx.db.site.update({
              where: { id },
              data: { customDomain: null },
            });
          }
          // If the site had a different customDomain before, we need to remove it from Vercel
          if (site && site.customDomain && site.customDomain !== value) {
            await removeDomainFromVercelProject(site.customDomain);
          }
        } else {
          result = await ctx.db.site.update({
            where: { id },
            data: { customDomain: value },
          });
        }
      } else if (key === "rootDir") {
        result = await ctx.db.site.update({
          where: { id },
          data: { rootDir: value },
        });
        await deleteProject(id); // TODO move to inngest workflow as well ?
        await inngest.send({
          name: "site/sync",
          data: {
            siteId: id,
            ghRepository: site.ghRepository,
            ghBranch: site.ghBranch,
            rootDir: value,
            accessToken: ctx.session.accessToken,
            initialSync: true,
          },
        });
      } else if (key === "autoSync") {
        if (value === "true") {
          try {
            const { id: webhookId } = await createGitHubRepoWebhook({
              ghRepository: site.ghRepository,
              accessToken: ctx.session.accessToken,
              webhookUrl: `${env.GH_WEBHOOK_URL}?siteid=${site.id}`, // Add site ID to webhook URL
            });
            result = await ctx.db.site.update({
              where: { id },
              data: { autoSync: true, webhookId: webhookId.toString() },
            });
          } catch (error) {
            throw new Error(
              "Failed to create webhook. Check if the repository has a webhook already installed.",
            );
          }
        } else {
          try {
            await deleteGitHubRepoWebhook({
              ghRepository: site.ghRepository,
              accessToken: ctx.session.accessToken,
              webhook_id: Number(site.webhookId),
            });
            result = await ctx.db.site.update({
              where: { id },
              data: { autoSync: false, webhookId: null },
            });
          } catch (error) {
            throw new Error(`Failed to delete webhook: ${error}`);
            // TODO if the webhook doesn't exist, we should still update the site
          }
        }
      } else {
        // Convert string values to proper types (e.g. "true"/"false" to boolean)
        const convertValue = (val: string) => {
          if (val === "true") return true;
          if (val === "false") return false;
          return val;
        };

        const convertedValue = convertValue(value);
        result = await ctx.db.site.update({
          where: { id },
          data: { [key]: convertedValue },
        });

        // If enableSearch is being turned on, trigger a force sync to index all files
        // Note: this is a temporary solution, to make sure people who upgrade now have their
        // site's indexes updated (but we index all documents, even for non-premium users atm, which we shouldn't)
        if (key === "enableSearch" && convertedValue === true) {
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

      revalidateTag(`${site.id}`);
      return result;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.id },
      });

      if (site?.webhookId) {
        try {
          await deleteGitHubRepoWebhook({
            ghRepository: site!.ghRepository,
            webhook_id: Number(site!.webhookId),
            accessToken: ctx.session.accessToken,
          });
        } catch (error) {
          console.error("Failed to delete webhook", error);
        }
      }

      await ctx.db.site.delete({
        where: { id: input.id },
      });

      await inngest.send({
        name: "site/delete",
        data: {
          siteId: input.id,
          accessToken: ctx.session.accessToken,
        },
      });

      return site;
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

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      const { id, ghRepository, ghBranch } = site!;
      const accessToken = ctx.session.accessToken;

      await inngest.send({
        name: "site/sync",
        data: {
          siteId: id,
          ghRepository,
          ghBranch,
          rootDir: site!.rootDir,
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

        if (!site) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Site not found",
          });
        }

        // Get all blobs for the site
        const blobs = await ctx.db.blob.findMany({
          where: {
            siteId: input.id,
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
            ghRepository: site!.ghRepository,
            ghBranch: site!.ghBranch,
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

  getSiteMap: publicProcedure
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

          const prefix = site.customDomain
            ? ""
            : resolveSiteAlias(
                `/@${site.user!.ghUsername}/${site.projectName}`,
                "to",
              );

          // Get all blobs for the site
          const blobs = (await ctx.db.blob.findMany({
            where: {
              siteId: site.id,
              extension: {
                in: ["md", "mdx"],
              },
            },
            select: {
              path: true,
              appPath: true,
              metadata: true,
            },
          })) as Blob[];

          return buildSiteMapFromSiteBlobs(blobs, prefix);
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
              prefix = `/@${site.user!.ghUsername}/${site.projectName}`;
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const site = (await ctx.db.site.findFirst({
        where: {
          AND: [{ id: input.siteId }],
        },
        select: {
          id: true,
          user: true,
          customDomain: true,
          projectName: true,
        },
      })) as SiteWithUser;

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      return await unstable_cache(
        async (input) => {
          const siteUrlPath = getSiteUrlPath(site);

          const dir = input.dir.replace(/^\//, "");
          const dirReadmePath = dir + "/README.md";
          const dirIndexPath = dir + "/index.md";

          const blobs = await ctx.db.$queryRaw<
            { path: string; app_path: string; metadata: PageMetadata }[]
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

          const items = blobs.map((b) => {
            const metadata = b.metadata;

            if (metadata.image) {
              metadata.image = resolveLink({
                link: metadata.image,
                filePath: b.path,
                prefixPath: siteUrlPath + "/_r/-",
              });
            }

            return {
              url: siteUrlPath + "/" + b.app_path,
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
          const blob = await ctx.db.blob.findUnique({
            where: {
              siteId_appPath: {
                siteId: input.siteId,
                appPath: input.slug,
              },
            },
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
          const blob = await ctx.db.blob.findUnique({
            where: {
              siteId_appPath: {
                siteId: input.siteId,
                appPath: input.slug,
              },
            },
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
                  : `/@${site.user!.ghUsername}/${site.projectName}/${
                      blob.appPath
                    }`;

              let avatar;

              if (metadata?.avatar) {
                if (metadata.avatar.startsWith("http")) {
                  avatar = metadata.avatar;
                } else {
                  // TODO make it work for relative paths too
                  avatar = site.customDomain
                    ? `/_r/-${metadata.avatar}`
                    : `/@${site.user!.ghUsername}/${site.projectName}` +
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
