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
  GitHubAPIRepoTree,
  getFileLastCommitTimestamp,
} from "@/lib/github";
import { fetchTree, deleteProject, fetchFile } from "@/lib/content-store";
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from "@/lib/domains";
import { TRPCError } from "@trpc/server";
import { PageMetadata } from "../types";
import { buildNestedTreeFromFilesMap } from "@/lib/build-nested-tree";
import { SiteConfig } from "@/components/types";
import { isSupportedExtension } from "@/lib/types";
import { env } from "@/env.mjs";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";

/* eslint-disable */
export const siteRouter = createTRPCRouter({
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
          syncStatus: "PENDING",
          user: { connect: { id: ctx.session.user.id } },
        },
      });

      // Then create webhook with site-specific URL
      let webhookId: string | null = null;
      try {
        const response = await createGitHubRepoWebhook({
          gh_repository,
          access_token,
          webhookUrl: `${env.GH_WEBHOOK_URL}?siteid=${site.id}`, // Add site ID to webhook URL
        });
        webhookId = response.id.toString();

        // Update site with webhook info
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
        key: z.string().min(1), // TODO better validation
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

        result = await ctx.db.site.update({
          where: { id },
          data: { [key]: convertValue(value) },
        });
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

      // site.customDomain &&
      //   (await revalidateTag(`${site.customDomain}-metadata`));

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

      await ctx.db.site.update({
        where: { id: input.id },
        data: {
          syncStatus: "PENDING",
        },
      });

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
  checkSyncStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const site = await ctx.db.site.findFirst({
        where: {
          id: input.id,
        },
      });

      // return false for PENDING and ERROR statuses
      let isUpToDate = false;

      if (site?.syncStatus === "SUCCESS") {
        // get tree from content store
        let contentStoreTree: GitHubAPIRepoTree | null = null;

        try {
          contentStoreTree = await fetchTree(site!.id, site!.gh_branch);
        } catch (error) {
          console.error("Failed to fetch tree from content store", error);
        }

        // get tree from GitHub
        const gitHubTree = await fetchGitHubRepoTree({
          gh_repository: site!.gh_repository,
          gh_branch: site!.gh_branch,
          access_token: ctx.session.accessToken,
        });
        isUpToDate = contentStoreTree
          ? contentStoreTree.sha === gitHubTree.sha
          : false;
      }

      return {
        isUpToDate,
        syncStatus: site!.syncStatus,
        syncError: JSON.stringify(site!.syncError),
        syncedAt: site!.syncedAt,
      };
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // don't cache this, it's used in the user dashboard
      return await ctx.db.site.findFirst({
        where: { id: input.id },
        include: {
          user: true,
        },
      });
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
  getTree: publicProcedure
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

          try {
            const prefix = customDomain
              ? ""
              : resolveSiteAlias(`/@${gh_username}/${projectName}`, "to");

            return buildNestedTreeFromFilesMap(
              Object.values(site.files as { [key: string]: PageMetadata }),
              prefix,
            );
          } catch {
            return null;
          }
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

          // TODO this is a workaround because we don't have and index of all files in the db yet
          // otherwise we could just query the db for all files
          const tree = await fetchTree(site.id, site.gh_branch);

          if (!tree) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Site tree not found",
            });
          }

          const normalizedRootDir = normalizeDir(site.rootDir || null);
          return tree.tree
            .filter((file) => {
              if (file.type === "tree") return false;
              if (!isSupportedExtension(file.path.split(".").pop() || ""))
                return false;
              return file.path.startsWith(normalizedRootDir);
            })
            .map((file) => "/" + file.path.replace(/\.mdx?$/, ""));
        },
        [`${input.gh_username}-${input.projectName}-permalinks`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.gh_username}-${input.projectName}-permalinks`],
        },
      )();
    }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }
    return await ctx.db.site.findMany({ include: { user: true } });
  }),
  getPageMetadata: publicProcedure
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

          const pageMetadata = (
            site.files ? site.files[input.slug] : {}
          ) as PageMetadata;

          if (!pageMetadata) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Page not found",
            });
          }

          return pageMetadata;
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

          // TODO types
          const path = (site.files as { [url: string]: PageMetadata })[
            input.slug
          ]?._path!;

          const content = await fetchFile({
            projectId: site.id,
            branch: site.gh_branch,
            path,
          });

          return content;
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
  // TODO TEMPORARY SOLUTION UNTIL WE HAVE A DB INDEX OF ALL FILES AND THEIR METADATA
  getFileLastModifiedDate: publicProcedure
    .input(
      z.object({
        gh_username: z.string().min(1),
        projectName: z.string().min(1),
        path: z.string(),
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

          // NOTE: only fetch for our core datasets as it requires a GitHub access token
          // and we don't want to consume the rate limit for other users
          // each time sb visits their site
          if (!site.gh_repository.startsWith("datasets/")) {
            return null;
          }

          return await getFileLastCommitTimestamp({
            gh_repository: site.gh_repository,
            branch: site.gh_branch,
            file_path: input.path,
            access_token: env.GH_ACCESS_TOKEN,
          });
        },
        [
          `${input.gh_username}-${input.projectName}-${input.path}-last-modified`,
        ],
        {
          revalidate: 60 * 5,
          tags: [
            `${input.gh_username}-${input.projectName}-${input.path}-last-modified`,
          ],
        },
      )();
    }),
});

export const normalizeDir = (dir: string | null) => {
  // remove leading and trailing slashes
  // remove leading ./
  if (!dir) return "";
  const normalizedDir = dir.replace(/^(.?\/)+|\/+$/g, "");
  return normalizedDir && `${normalizedDir}/`;
};
