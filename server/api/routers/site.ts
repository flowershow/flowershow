import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";
import YAML from "yaml";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { filePathsToPermalinks } from "@/lib/file-paths-to-permalinks";
import {
  fetchGitHubRepoTree,
  fetchGitHubFile,
  checkIfBranchExists,
  fetchGitHubFileBlob,
  GitHubAPIRepoTree,
} from "@/lib/github";
import {
  uploadFile,
  uploadTree,
  fetchTree,
  deleteProject,
  deleteFile,
  fetchFile,
} from "@/lib/content-store";
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from "@/lib/domains";
import {
  SupportedExtension,
  isSupportedExtension,
  isSupportedMarkdownExtension,
} from "@/lib/types";
import { env } from "@/env.mjs";
import { TRPCError } from "@trpc/server";
import { computeMetadata } from "@/lib/computed-fields";
import { DataPackage } from "@/components/layouts/datapackage-types";
import { PageMetadata } from "../types";
import { Site } from "@prisma/client";

/* eslint-disable */
export const siteRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        gh_repository: z.string().min(1),
        gh_scope: z.string().min(1),
        gh_branch: z.string().min(1),
        rootDir: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { gh_repository, gh_scope, gh_branch, rootDir } = input;
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
      let projectName = gh_repository.split("/")[1] as string;
      let num = 2;

      while (
        await ctx.db.site.findFirst({
          where: {
            AND: [{ projectName }, { user: { id: ctx.session.user.id } }],
          },
        })
      ) {
        projectName = `${input.gh_repository.split("/")[1]}-${num}`;
      }

      // create site in the database
      const site = await ctx.db.site.create({
        data: {
          projectName,
          gh_repository,
          gh_scope,
          gh_branch,
          rootDir,
          user: { connect: { id: ctx.session.user.id } },
        },
        include: { user: true },
      });

      try {
        const tree = await fetchGitHubRepoTree({
          gh_repository,
          gh_branch,
          access_token,
        });

        const filesMetadata = await processGitHubTree({
          gh_repository,
          gh_branch,
          access_token,
          tree,
          site,
          rootDir,
        });

        await uploadTree({
          projectId: site.id,
          branch: gh_branch,
          tree,
        });

        await ctx.db.site.update({
          where: { id: site.id },
          data: {
            synced: true,
            syncedAt: new Date(),
            files: filesMetadata as any, // TODO: fix types
          },
        });
      } catch (error) {
        await ctx.db.site.update({
          where: { id: site.id },
          data: {
            synced: false,
          },
        });
        throw new Error(`Failed to create site: ${error}`);
      }
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
      let response;

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
          response = await ctx.db.site.update({
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
          response = await ctx.db.site.update({
            where: { id },
            data: { customDomain: null },
          });
        }
        // If the site had a different customDomain before, we need to remove it from Vercel
        if (site && site.customDomain && site.customDomain !== value) {
          await removeDomainFromVercelProject(site.customDomain);
        }
      } else if (key === "rootDir") {
        response = await ctx.db.site.update({
          where: { id },
          data: {
            rootDir: value,
            synced: false,
            files: {},
          },
        });
        try {
          const tree = await fetchGitHubRepoTree({
            gh_repository: response.gh_repository,
            gh_branch: response.gh_branch,
            access_token: ctx.session.accessToken,
          });

          await deleteProject(id);

          const filesMetadata = await processGitHubTree({
            gh_repository: response.gh_repository,
            gh_branch: response.gh_branch,
            access_token: ctx.session.accessToken,
            tree,
            site,
            rootDir: value,
          });

          await uploadTree({
            projectId: id,
            branch: response.gh_branch,
            tree,
          });

          await ctx.db.site.update({
            where: { id },
            data: {
              synced: true,
              syncedAt: new Date(),
              files: filesMetadata as any, // TODO: fix types
            },
          });
        } catch (error) {
          await ctx.db.site.update({
            where: { id },
            data: {
              synced: false,
            },
          });
          throw new Error(`Failed to sync site: ${error}`);
        }
      } else {
        // If the key is not one of the special cases handled above, we update it directly
        response = await ctx.db.site.update({
          where: { id },
          data: { [key]: value },
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

      return response;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.id },
        include: {
          user: true,
        },
      });

      const response = await ctx.db.site.delete({
        where: { id: input.id },
      });

      // delete project from content store
      try {
        await deleteProject(input.id);
      } catch (error) {
        // TODO this should be a log only
        throw new Error(`Failed to delete site content ${input.id}: ${error}`);
      }

      // revalidate the site metadata
      revalidateTag(`${site?.user?.gh_username}-${site?.projectName}-metadata`);

      return response;
    }),
  sync: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        force: z.boolean().optional(), // don't check if the trees are different
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findFirst({
        where: {
          id: input.id,
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

      const { id, gh_repository, gh_branch } = site!;
      const access_token = ctx.session.accessToken;

      try {
        // fetch content store tree
        const contentStoreTree = input.force
          ? null
          : await fetchTree(site!.id, site!.gh_branch);
        // fetch GitHub repo tree
        const gitHubTree = await fetchGitHubRepoTree({
          gh_repository,
          gh_branch,
          access_token,
        });

        const filesMetadata = await processGitHubTree({
          gh_repository,
          gh_branch,
          access_token,
          tree: gitHubTree,
          previousTree: contentStoreTree,
          site,
          filesMetadata: site.files as any, // TODO: fix types
          rootDir: site!.rootDir,
        });

        // If all goes well, update the content store tree to match the GitHub tree
        await uploadTree({
          projectId: id,
          branch: gh_branch,
          tree: gitHubTree,
        });
        await ctx.db.site.update({
          where: { id: site!.id },
          data: {
            files: filesMetadata as any, // TODO: fix types
            synced: true,
            syncedAt: new Date(),
          },
        });
      } catch (error) {
        await ctx.db.site.update({
          where: { id: site!.id },
          data: {
            synced: false,
          },
        });
        throw new Error(`Failed to sync site ${site!.id}: ${error}`);
      }

      // revalidate the site metadata
      revalidateTag(
        `${site!.user?.gh_username} - ${site!.projectName} - metadata`,
      );
      // revalidatee the site's permalinks
      revalidateTag(
        `${site!.user?.gh_username} - ${site!.projectName} - permalinks`,
      );
      // revalidate all the pages' content
      revalidateTag(
        `${site!.user?.gh_username} - ${site!.projectName} - page - content`,
      );
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

      // get tree from content store
      const contentStoreTree = await fetchTree(site!.id, site!.gh_branch);
      // get tree from GitHub
      const gitHubTree = await fetchGitHubRepoTree({
        gh_repository: site!.gh_repository,
        gh_branch: site!.gh_branch,
        access_token: ctx.session.accessToken,
      });

      return {
        synced:
          site!.synced &&
          contentStoreTree &&
          contentStoreTree.sha === gitHubTree.sha,
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
          });
        },
        [`${input.gh_username} - ${input.projectName} - metadata`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.gh_username} - ${input.projectName} - metadata`],
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

          // generate a list of permalinks
          const filePaths = Object.entries(
            site.files as { [url: string]: PageMetadata },
          ).map(([url, metadata]) => {
            // TODO revise this; filePathsToPermalinks expects a list of file paths with extension
            return metadata._path;
          });
          const r2SiteRawUrl = `https://${env.R2_BUCKET_DOMAIN}/${site.id}/${site.gh_branch}/raw`;
          const siteBasePath = `/@${site.user?.gh_username}/${site.projectName}`;
          const permalinks = filePathsToPermalinks({
            filePaths,
            rawBaseUrl: r2SiteRawUrl,
            pathPrefix: siteBasePath,
          });

          return { content, permalinks };
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

export const normalizeDir = (dir: string | null) => {
  // remove leading and trailing slashes
  // remove leading ./
  if (!dir) return "";
  const normalizedDir = dir.replace(/^(.?\/)+|\/+$/g, "");
  return normalizedDir && `${normalizedDir}/`;
};

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

// TODO revise and refactor this function
const processGitHubTree = async ({
  gh_repository,
  gh_branch,
  access_token,
  tree,
  site,
  previousTree,
  rootDir,
  filesMetadata = {},
}: {
  gh_repository: string;
  gh_branch: string;
  access_token: string;
  tree: GitHubAPIRepoTree;
  site: SiteWithUser;
  previousTree?: GitHubAPIRepoTree | null; // fix this type
  rootDir?: string | null; // fix this type
  filesMetadata?: { [url: string]: PageMetadata };
}) => {
  // adjust user input to be comparable to file paths from GitHub API tree
  // it's used to filter out files that are not in the rootDir
  const normalizedRootDir = normalizeDir(rootDir || null);

  if (previousTree && previousTree.sha === tree.sha) {
    throw new Error("Already in sync with GitHub.");
  }

  // if previousTree is not provided, the map will be empty
  const contentStoreMap = new Map(
    previousTree?.tree
      .filter((file) => {
        if (file.type === "tree") return false;
        if (!isSupportedExtension(file.path.split(".").pop() || ""))
          return false;
        return file.path.startsWith(normalizedRootDir);
      })
      .map((file) => [file.path, file.sha] || []),
  );

  const gitHubMap = new Map(
    tree.tree
      .filter((file) => {
        if (file.type === "tree") return false;
        if (!isSupportedExtension(file.path.split(".").pop() || ""))
          return false;
        return file.path.startsWith(normalizedRootDir);
      })
      .map((file) => [file.path, file.sha]),
  );

  // process and upload each file from gitHubMap to the content store
  try {
    for (const [path, sha] of gitHubMap.entries()) {
      // check if the file is already in the content store and hasn't changed
      if (contentStoreMap.has(path) && contentStoreMap.get(path) === sha) {
        continue;
      }
      // fetch and upload the file content to the content store
      const fileExtension = path.split(".").pop() as SupportedExtension; // files with unsupported extensions were filtered out earlier

      const contentStoreFilePath = path.replace(normalizedRootDir, "");

      const gitHubFileBlob = await fetchGitHubFileBlob({
        gh_repository,
        file_sha: sha,
        access_token,
      });

      await uploadFile({
        projectId: site.id,
        branch: gh_branch,
        path: contentStoreFilePath,
        content: Buffer.from(await gitHubFileBlob.arrayBuffer()),
        extension: fileExtension,
      });

      // if the file is a markdown file, parse it and save metadata
      if (isSupportedMarkdownExtension(fileExtension)) {
        const markdown = await gitHubFileBlob.text();

        // special case for README.md and index.md files
        let datapackage: DataPackage | null = null;
        if (path.endsWith("README.md") || path.endsWith("index.md")) {
          let fileDir = path.split("/").slice(0, -1).join("/");
          fileDir = fileDir ? `${fileDir}/` : "";

          const datapackageTreeItem =
            // TODO probably should look for the file in the map isntead
            tree.tree.find((f) => {
              return (
                f.path === `${fileDir}datapackage.json` ||
                f.path === `${fileDir}datapackage.yaml` ||
                f.path === `${fileDir}datapackage.yml`
              );
            }) || null;

          if (datapackageTreeItem) {
            // TODO potentially duplicate fetch; refactor to avoid
            const datapackageGitHubFile = await fetchGitHubFile({
              gh_repository,
              gh_branch,
              access_token,
              path: datapackageTreeItem.path,
            });

            const datapackageFileExtension = datapackageTreeItem.path
              .split(".")
              .pop() as SupportedExtension; // json, yaml, or yml are supported

            const datapackageContentString = Buffer.from(
              datapackageGitHubFile.content,
              "base64",
            ).toString("utf-8");

            if (datapackageFileExtension === "json") {
              datapackage = JSON.parse(datapackageContentString) as DataPackage;
            } else if (
              datapackageFileExtension === "yaml" ||
              datapackageFileExtension === "yml"
            ) {
              datapackage = YAML.parse(datapackageContentString) as DataPackage; // datapackageContent is base64 encoded, so we need to decode it
            }
          }
        }

        const fileMetadata = await computeMetadata({
          source: markdown,
          datapackage,
          path: contentStoreFilePath,
          tree,
          site,
        });

        filesMetadata[fileMetadata._url] = fileMetadata;
      }
    }

    // check for deleted files in GitHub
    for (const path of contentStoreMap.keys()) {
      if (!gitHubMap.has(path)) {
        // the file exists in the content store but not in GitHub, so delete it from the content store
        const contentStorePath = path.replace(normalizedRootDir, "");
        await deleteFile({
          projectId: site.id,
          branch: gh_branch,
          path: contentStorePath,
        });
        delete filesMetadata[contentStorePath];
      }
    }
  } catch (error) {
    console.error("Error processing GitHub tree:", error);
    throw new Error("Error processing GitHub tree");
  }
  return filesMetadata;
};
