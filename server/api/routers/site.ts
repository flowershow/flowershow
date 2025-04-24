import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";
import { parse as parseYAML } from "yaml";

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
import { PageMetadata, DatasetPageMetadata } from "../types";
import { resolveLink } from "@/lib/resolve-link";
import { SiteWithUser } from "@/types";

/* eslint-disable */
export const siteRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        gh_username: z.string().min(1),
        projectName: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          return ctx.db.site.findFirst({
            where: {
              AND: [
                { projectName: input.projectName },
                { user: { gh_username: input.gh_username } },
              ],
            },
            include: {
              user: {
                select: {
                  gh_username: true,
                },
              },
            },
          });
        },
        [`${input.gh_username} - ${input.projectName} - metadata`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.gh_username} - ${input.projectName} - metadata`],
        },
      )();
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
  getByDomain: publicProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          return ctx.db.site.findFirst({
            where: {
              customDomain: input.domain,
            },
            include: {
              user: {
                select: {
                  gh_username: true,
                },
              },
            },
          });
        },
        [`${input.domain} - site - metadata`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.domain} - site - metadata`],
        },
      )();
    }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }
    return await ctx.db.site.findMany({ include: { user: true } });
  }),
  create: protectedProcedure
    .input(
      z.object({
        gh_repository: z.string().min(1),
        gh_branch: z.string().min(1),
        rootDir: z.string().optional(),
        projectName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { gh_repository, gh_branch, rootDir } = input;
      const access_token = ctx.session.accessToken;

      // check if branch exists
      const branchExists = await checkIfBranchExists({
        gh_repository,
        gh_branch,
        access_token,
      });

      if (!branchExists) {
        throw new Error(
          `Branch ${input.gh_branch} does not exist in repository ${input.gh_repository}`,
        );
      }

      //use repository name as an initial project name
      //and append a number if the name is already taken
      let projectName =
        input.projectName ?? (gh_repository.split("/")[1] as string);
      let num = 2;

      while (
        await ctx.db.site.findFirst({
          where: {
            AND: [{ projectName }, { user: { id: ctx.session.user.id } }],
          },
        })
      ) {
        projectName = `${input.gh_repository.split("/")[1]}-${num}`;
        num++;
      }

      // First create site without webhook
      const site = await ctx.db.site.create({
        data: {
          projectName,
          gh_repository,
          gh_branch,
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
          gh_repository,
          access_token,
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
          gh_repository,
          gh_branch,
          rootDir: site.rootDir,
          access_token,
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
            gh_repository: site.gh_repository,
            gh_branch: site.gh_branch,
            rootDir: value,
            access_token: ctx.session.accessToken,
            initialSync: true,
          },
        });
      } else if (key === "autoSync") {
        if (value === "true") {
          try {
            const { id: webhookId } = await createGitHubRepoWebhook({
              gh_repository: site.gh_repository,
              access_token: ctx.session.accessToken,
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
              gh_repository: site.gh_repository,
              access_token: ctx.session.accessToken,
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
              gh_repository: site.gh_repository,
              gh_branch: site.gh_branch,
              rootDir: site.rootDir,
              access_token: ctx.session.accessToken,
              forceSync: true,
            },
          });
        }
      }

      // revalidate the site metadata
      revalidateTag(`${site?.user?.gh_username}-${site?.projectName}-metadata`);

      if (key === "gh_branch") {
        // revalidate the site's permalinks
        revalidateTag(
          `${site?.user?.gh_username}-${site?.projectName}-permalinks`,
        );
        // revalidate all the pages' content
        revalidateTag(
          `${site?.user?.gh_username}-${site?.projectName}-page-content`,
        );
      }
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
            gh_repository: site!.gh_repository,
            webhook_id: Number(site!.webhookId),
            access_token: ctx.session.accessToken,
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
          access_token: ctx.session.accessToken,
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

      const { id, gh_repository, gh_branch } = site!;
      const access_token = ctx.session.accessToken;

      await inngest.send({
        name: "site/sync",
        data: {
          siteId: id,
          gh_repository,
          gh_branch,
          rootDir: site!.rootDir,
          access_token,
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
    .query(async ({ ctx, input }) => {
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

      // Calculate aggregate sync status
      let aggregateSyncStatus: Status = "SUCCESS";
      let syncError: string | null = null;
      let latestSyncedAt: Date | null = null;

      // If any blob is PENDING, site is PENDING
      if (blobs.some((b) => b.syncStatus === "PENDING")) {
        aggregateSyncStatus = "PENDING";
      }
      // If any blob is ERROR, site is ERROR
      else if (blobs.some((b) => b.syncStatus === "ERROR")) {
        aggregateSyncStatus = "ERROR";
        const errorMessages = blobs
          .filter((b) => b.syncStatus === "ERROR")
          .map((b) =>
            b.syncError
              ? `[${b.path}]: ${b.syncError}`
              : `[${b.path}]: Unknown error`,
          );
        syncError = errorMessages.join("\n");
      }

      // Get the most recent update date
      latestSyncedAt =
        blobs
          .map((b) => b.updatedAt)
          .sort((a, b) => b.getTime() - a.getTime())[0] || null;

      let isUpToDate = false;

      if (aggregateSyncStatus === "SUCCESS") {
        // get current site tree
        let currentTree = site.tree;

        // get latest tree from GitHub
        const gitHubTree = await fetchGitHubRepoTree({
          gh_repository: site!.gh_repository,
          gh_branch: site!.gh_branch,
          access_token: ctx.session.accessToken,
        });
        isUpToDate = currentTree?.["sha"] === gitHubTree.sha;
      }

      return {
        isUpToDate,
        syncStatus: aggregateSyncStatus,
        syncError,
        syncedAt: latestSyncedAt,
      };
    }),
  getCustomStyles: publicProcedure
    .input(
      z.object({
        gh_username: z.string().min(1),
        projectName: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          const site = await ctx.db.site.findFirst({
            where: {
              AND: [
                { projectName: input.projectName },
                { user: { gh_username: input.gh_username } },
              ],
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
              branch: site.gh_branch,
              path: "custom.css",
            });
          } catch {
            return null;
          }
        },
        [`${input.gh_username} - ${input.projectName} - customStyles`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.gh_username} - ${input.projectName} - customStyles`],
        },
      )();
    }),

  getConfig: publicProcedure
    .input(
      z.object({
        gh_username: z.string().min(1),
        projectName: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          const site = await ctx.db.site.findFirst({
            where: {
              AND: [
                { projectName: input.projectName },
                { user: { gh_username: input.gh_username } },
              ],
            },
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
              branch: site.gh_branch,
              path: "config.json",
            });
            // TODO is casting to SiteConfig safe?
            return config ? (JSON.parse(config) as SiteConfig) : null;
          } catch {
            return null;
          }
        },
        [`${input.gh_username} - ${input.projectName} - customStyles`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.gh_username} - ${input.projectName} - customStyles`],
        },
      )();
    }),

  getSiteMap: publicProcedure
    .input(
      z.object({
        gh_username: z.string().min(1),
        projectName: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          const site = await ctx.db.site.findFirst({
            where: {
              AND: [
                { projectName: input.projectName },
                { user: { gh_username: input.gh_username } },
              ],
            },
          });

          if (!site) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Site not found",
            });
          }

          const { gh_username, projectName } = input;
          const { customDomain } = site;

          const prefix = customDomain
            ? ""
            : resolveSiteAlias(`/@${gh_username}/${projectName}`, "to");

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
        [`${input.gh_username}-${input.projectName}-tree`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.gh_username}-${input.projectName}-tree`],
        },
      )();
    }),

  getPermalinks: publicProcedure
    .input(
      z.object({
        gh_username: z.string().min(1),
        projectName: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          const site = await ctx.db.site.findFirst({
            where: {
              AND: [
                { projectName: input.projectName },
                { user: { gh_username: input.gh_username } },
              ],
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
            },
          });

          return blobs.map((blob) => "/" + blob.path.replace(/\.mdx?$/, ""));
        },
        [`${input.gh_username}-${input.projectName}-permalinks`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.gh_username}-${input.projectName}-permalinks`],
        },
      )();
    }),
  getCatalogFiles: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        dir: z.string().min(1), // absolute dir
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          const site = await ctx.db.site.findFirst({
            where: {
              AND: [{ id: input.siteId }],
            },
          });

          if (!site) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Site not found",
            });
          }

          const dir = input.dir.replace(/^\//, "");
          const dirReadmePath = dir + "/README.md";
          const dirIndexPath = dir + "/index.md";

          const blobs = await ctx.db.blob.findMany({
            where: {
              siteId: site.id,
              path: {
                startsWith: dir,
                not: {
                  in: [dirReadmePath, dirIndexPath],
                },
              },
              extension: {
                in: ["mdx", "md"],
              },
            },
            select: {
              appPath: true,
              metadata: true,
            },
          });

          return blobs.map((b) => ({
            _url: b.appPath,
            metadata: b.metadata as PageMetadata,
          }));
        },
        [`${input.siteId}-${input.dir}-blobs`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.siteId}-${input.dir}-files`],
        },
      )();
    }),
  getBlob: publicProcedure
    .input(
      z.object({
        gh_username: z.string().min(1),
        projectName: z.string().min(1),
        slug: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          const site = await ctx.db.site.findFirst({
            where: {
              AND: [
                { projectName: input.projectName },
                { user: { gh_username: input.gh_username } },
              ],
            },
          });

          if (!site) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Site not found",
            });
          }

          const blob = await ctx.db.blob.findUnique({
            where: {
              siteId_appPath: {
                siteId: site.id,
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
        [`${input.gh_username} - ${input.projectName} - ${input.slug} - meta`],
        {
          revalidate: 60, // 1 minute
          tags: [
            `${input.gh_username} - ${input.projectName} - ${input.slug} - meta`,
          ],
        },
      )();
    }),
  getPageContent: publicProcedure
    .input(
      z.object({
        gh_username: z.string().min(1),
        projectName: z.string().min(1),
        slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          const site = await ctx.db.site.findFirst({
            where: {
              AND: [
                { projectName: input.projectName },
                { user: { gh_username: input.gh_username } },
              ],
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

          const blob = await ctx.db.blob.findUnique({
            where: {
              siteId_appPath: {
                siteId: site.id,
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

          const content = await fetchFile({
            projectId: site.id,
            branch: site.gh_branch,
            path: blob.path,
          });

          let metadata = blob.metadata as PageMetadata;

          if (metadata.layout === "dataset") {
            // Get the directory path from blob.path
            const dirPath = blob.path.split("/").slice(0, -1).join("/");

            // Look for datapackage files in the same directory
            // For root directory files (like README.md), dirPath will be empty
            // so we need to handle that case specially to avoid paths starting with "/"
            const datapackagePaths = dirPath
              ? [
                  `${dirPath}/datapackage.json`,
                  `${dirPath}/datapackage.yaml`,
                  `${dirPath}/datapackage.yml`,
                ]
              : ["datapackage.json", "datapackage.yaml", "datapackage.yml"];

            const possibleDatapackages = await ctx.db.blob.findFirst({
              where: {
                siteId: site.id,
                path: {
                  in: datapackagePaths,
                },
              },
            });

            if (possibleDatapackages) {
              // Fetch and parse the datapackage file
              const datapackageContent = await fetchFile({
                projectId: site.id,
                branch: site.gh_branch,
                path: possibleDatapackages.path,
              });

              if (datapackageContent) {
                try {
                  // Parse JSON or YAML based on file extension
                  const datapackage = possibleDatapackages.path.endsWith(
                    ".json",
                  )
                    ? JSON.parse(datapackageContent)
                    : parseYAML(datapackageContent);

                  // Hydrate with some extra resource metadata
                  datapackage.resources = await Promise.all(
                    datapackage.resources.map(async (resource) => {
                      let modifiedDate;

                      if (resource.modified) {
                        modifiedDate = new Date(
                          resource.modified,
                        ).toISOString();
                      } else if (resource.path.startsWith("http")) {
                        modifiedDate = null;
                      } else {
                        const resourceBlob = await ctx.db.blob.findUnique({
                          where: {
                            siteId_appPath: {
                              siteId: site.id,
                              appPath: input.slug,
                            },
                          },
                        });
                        modifiedDate = resourceBlob?.updatedAt;
                      }

                      // TODO not sure where to put it, it's duplicate already used elsewher
                      const rawFilePermalinkBase = site.customDomain
                        ? `/_r/-`
                        : `/@${site.user!.gh_username}/${site.projectName}` +
                          `/_r/-`;

                      const resolveAssetUrl = (url: string) =>
                        resolveLink({
                          link: url,
                          filePath: blob.path,
                          prefixPath: rawFilePermalinkBase,
                        });

                      return {
                        ...resource,
                        modified: modifiedDate,
                        path: resolveAssetUrl(resource.path),
                      };
                    }),
                  );

                  // Merge datapackage properties into metadata
                  metadata = {
                    ...metadata,
                    ...datapackage,
                  } as DatasetPageMetadata;
                } catch (error) {
                  console.error("Failed to parse datapackage:", error);
                }
              }
            }
          }

          return { content, metadata };
        },
        [`${input.gh_username}-${input.projectName}-${input.slug}-content`],
        {
          revalidate: 60, // 1 minute
          tags: [
            `${input.gh_username}-${input.projectName}-${input.slug}-content`,
            `${input.gh_username}-${input.projectName}-page-content`,
          ],
        },
      )();
    }),
});
