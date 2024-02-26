import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";

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
} from "@/lib/github";
import {
  uploadContent,
  uploadTree,
  fetchTree,
  deleteProject,
  deleteContent,
  fetchContent,
} from "@/lib/content-store";
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from "@/lib/domains";
import {
  isSupportedAssetExtension,
  isSupportedExtension,
  isSupportedMarkdownExtension,
} from "@/lib/types";
import { env } from "@/env.mjs";

/* eslint-disable */
export const siteRouter = createTRPCRouter({
  // PROTECTED
  create: protectedProcedure
    .input(
      z.object({
        gh_repository: z.string().min(1),
        gh_scope: z.string().min(1),
        gh_branch: z.string().min(1),
        //...
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // check if branch exists
      const branchExists = await checkIfBranchExists({
        gh_repository: input.gh_repository,
        gh_branch: input.gh_branch,
        access_token: ctx.session.accessToken,
      });

      if (!branchExists) {
        throw new Error(
          `Branch ${input.gh_branch} does not exist in repository ${input.gh_repository}`,
        );
      }

      let projectName = input.gh_repository.split("/")[1] as string;
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

      const site = await ctx.db.site.create({
        data: {
          projectName,
          gh_repository: input.gh_repository,
          gh_scope: input.gh_scope,
          gh_branch: input.gh_branch,
          user: { connect: { id: ctx.session.user.id } },
        },
      });

      // upload to content store
      try {
        // fetch GitHub repo tree
        const tree = await fetchGitHubRepoTree({
          gh_repository: input.gh_repository,
          gh_branch: input.gh_branch,
          access_token: ctx.session.accessToken,
        });
        // upload each file to content store
        await Promise.all(
          tree.tree.map(async (file) => {
            // ignore directories
            if (file.type === "tree") return;
            // ignore unsupported file types
            const [path, extension = ""] = file.path.split(".");
            if (!isSupportedExtension(extension)) return;
            // fetch file content from GitHub
            const content = await fetchGitHubFile({
              gh_repository: input.gh_repository,
              gh_branch: input.gh_branch,
              path: file.path,
              access_token: ctx.session.accessToken,
            });

            await uploadContent({
              projectId: site.id,
              branch: input.gh_branch,
              path: isSupportedMarkdownExtension(extension) ? path! : file.path, // TODO assertion
              content,
              extension,
            });
          }),
        );

        // upload tree to content store
        await uploadTree({
          projectId: site.id,
          branch: input.gh_branch,
          tree,
        });

        await ctx.db.site.update({
          where: { id: site.id },
          data: {
            synced: true,
            syncedAt: new Date(),
          },
        });
      } catch (error) {
        await ctx.db.site.update({
          where: { id: site.id },
          data: {
            synced: false,
          },
        });
        throw new Error(`Failed to upload site content: ${error}`);
      }

      return site;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        key: z.string().min(1), // TODO better validation
        value: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, key, value } = input;
      let response;

      const site = await ctx.db.site.findUnique({
        where: { id },
        include: { user: true },
      });

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
        const site = await ctx.db.site.findUnique({ where: { id } });
        if (site && site.customDomain && site.customDomain !== value) {
          await removeDomainFromVercelProject(site.customDomain);
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
        // revalidatee the site's permalinks
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

      // fetch content store tree
      const contentStoreTree = await fetchTree(site!.id, site!.gh_branch);
      // fetch GitHub repo tree
      const gitHubTree = await fetchGitHubRepoTree({
        gh_repository: site!.gh_repository,
        gh_branch: site!.gh_branch,
        access_token: ctx.session.accessToken,
      });

      // edge case for when the site has been created but no content has been uploaded
      if (!contentStoreTree) {
        try {
          // upload each file to content store
          await Promise.all(
            gitHubTree.tree.map(async (file) => {
              // ignore directories
              if (file.type === "tree") return;
              // ignore unsupported file types
              const [path, extension = ""] = file.path.split(".");
              if (!isSupportedExtension(extension)) return;
              // fetch file content from GitHub
              const content = await fetchGitHubFile({
                gh_repository: site!.gh_repository,
                gh_branch: site!.gh_branch,
                path: file.path,
                access_token: ctx.session.accessToken,
              });
              await uploadContent({
                projectId: site!.id,
                branch: site!.gh_branch,
                path: isSupportedMarkdownExtension(extension)
                  ? path!
                  : file.path, // TODO is there a better way to do this?
                content,
                extension,
              });
            }),
          );

          // upload tree to content store
          await uploadTree({
            projectId: site!.id,
            branch: site!.gh_branch,
            tree: gitHubTree,
          });

          return await ctx.db.site.update({
            where: { id: site!.id },
            data: {
              synced: true,
              syncedAt: new Date(),
            },
          });
        } catch (error) {
          throw new Error(`Failed to upload site content: ${error}`);
        }
      }

      if (contentStoreTree.sha !== gitHubTree.sha) {
        console.log("Trees are different, syncing content store with GitHub");
        // The trees are different, so we need to sync the content store with GitHub
        const contentStoreMap = new Map(
          contentStoreTree.tree.map((file) => [file.path, file.sha]),
        );
        const gitHubMap = new Map(
          gitHubTree.tree.map((file) => [file.path, file.sha]),
        ); // make sure this matches your data structure

        try {
          // Check for new or updated files in GitHub
          for (const [_path, sha] of gitHubMap.entries()) {
            if (
              !contentStoreMap.has(_path) ||
              contentStoreMap.get(_path) !== sha
            ) {
              // This means the file is new or updated in GitHub
              // Fetch and upload the file content to the content store
              console.log(`Uploading ${_path} to content store`);
              const [path, extension = ""] = _path.split(".");
              // ignore unsupported file types
              if (!isSupportedExtension(extension)) continue;
              const content = await fetchGitHubFile({
                gh_repository: site!.gh_repository,
                gh_branch: site!.gh_branch,
                path: _path,
                access_token: ctx.session.accessToken,
              });
              await uploadContent({
                projectId: site!.id,
                branch: site!.gh_branch,
                path: isSupportedAssetExtension(extension) ? _path : path!, // TODO assertion
                content,
                extension,
              });
            }
          }

          // Check for deleted files in GitHub
          for (const path of contentStoreMap.keys()) {
            if (!gitHubMap.has(path)) {
              // The file exists in the content store but not in GitHub, so delete it from the content store
              const [_path, extension = ""] = path.split(".");
              console.log(`Deleting ${path} from content store`);
              await deleteContent({
                projectId: site!.id,
                branch: site!.gh_branch,
                path: isSupportedMarkdownExtension(extension) ? _path! : path, // TODO find a better way to do this
              });
            }
          }
          // If all goes well, update the content store tree to match the GitHub tree
          console.log("Updating content store tree");
          await uploadTree({
            projectId: site!.id,
            branch: site!.gh_branch,
            tree: gitHubTree,
          });
          await ctx.db.site.update({
            where: { id: site!.id },
            data: {
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
      }

      // revalidate site status
      revalidateTag(`${input.id}-status`);
      // revalidate the site metadata
      revalidateTag(`${site!.user?.gh_username}-${site!.projectName}-metadata`);
      // revalidatee the site's permalinks
      revalidateTag(
        `${site!.user?.gh_username}-${site!.projectName}-permalinks`,
      );
      // revalidate all the pages' content
      revalidateTag(
        `${site!.user?.gh_username}-${site!.projectName}-page-content`,
      );
    }),
  // checkSyncStatus: protectedProcedure
  //   .input(
  //     z.object({
  //       id: z.string().min(1),
  //     }),
  //   )
  //   .query(async ({ ctx, input }) => {
  //     return await unstable_cache(
  //       async () => {

  //         const site = await ctx.db.site.findFirst({
  //           where: {
  //             id: input.id,
  //           },
  //         });

  //         // get tree from content store
  //         const contentStoreTree = await fetchTree(site!.id, site!.gh_branch);
  //         // get tree from GitHub
  //         const gitHubTree = await fetchGitHubRepoTree({
  //           gh_repository: site!.gh_repository,
  //           gh_branch: site!.gh_branch,
  //           access_token: ctx.session.accessToken,
  //         });

  //         return {
  //           synced: contentStoreTree.sha === gitHubTree.sha,
  //           syncedAt: site!.syncedAt,
  //         };
  //       },
  //       [`${input.id}-status`],
  //       {
  //         revalidate: 1, // 5 minutes
  //         tags: [`${input.id}-status`],
  //       },
  //     )();
  //   }),
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
        [`${input.gh_username}-${input.projectName}-metadata`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.gh_username}-${input.projectName}-metadata`],
        },
      )();
    }),
  getSitePermalinks: publicProcedure
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

          if (!site) return null;

          const tree = await fetchTree(site.id, site.gh_branch);

          if (!tree) return null;

          // TODO or should we generate it based on files uploaded to the content store?
          // this way filtering is not needed
          const filePaths = tree.tree
            .filter((file) => {
              if (file.type === "tree") return false;
              // ignore unsupported file types
              const [_, extension = ""] = file.path.split(".");
              if (!isSupportedExtension(extension)) return false;
              return true;
            })
            .map((file) => {
              // ignore directories
              // TODO revise this; filePathsToPermalinks expects a list of file paths with extension
              return file.path;
            });

          const r2SiteRawUrl = `https://${env.R2_BUCKET_DOMAIN}/${site.id}/${site.gh_branch}/raw`;
          const siteBasePath = `/@${input.gh_username}/${input.projectName}`;
          const permalinks = filePathsToPermalinks({
            filePaths,
            rawBaseUrl: r2SiteRawUrl,
            pathPrefix: siteBasePath,
          });

          return permalinks;
        },
        [`${input.gh_username}-${input.projectName}-permalinks`],
        {
          revalidate: 60, // 1 minute
          tags: [`${input.gh_username}-${input.projectName}-permalinks`],
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
          });

          if (!site) return null;

          let content: string | null = null;

          // TODO extract this to a function
          // if slug is empty, fetch index.md or README.md
          if (input.slug === "") {
            try {
              // });
              content =
                (await fetchContent({
                  projectId: site.id,
                  branch: site.gh_branch,
                  path: "index",
                })) ?? null;
            } catch (error) {
              try {
                content =
                  (await fetchContent({
                    projectId: site.id,
                    branch: site.gh_branch,
                    path: "README",
                  })) ?? null;
              } catch (error) {
                throw new Error(
                  `Could not read ${site.gh_repository}/index.md or ${site.gh_repository}/README.md on branch ${site.gh_branch} from GitHub: ${error}`,
                );
              }
            }
          } else {
            // fetch [slug].md or [slug]/index.md
            try {
              content =
                (await fetchContent({
                  projectId: site.id,
                  branch: site.gh_branch,
                  path: input.slug,
                })) ?? null;
            } catch (error) {
              try {
                content =
                  (await fetchContent({
                    projectId: site.id,
                    branch: site.gh_branch,
                    path: input.slug + "/index", // TODO also check for README.md
                  })) ?? null;
              } catch (error) {
                throw new Error(
                  `Could not read ${site.gh_repository}/${input.slug}.md or ${site.gh_repository}/${input.slug}/index.md on branch ${site.gh_branch} from GitHub: ${error}`,
                );
              }
            }
          }

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
});
