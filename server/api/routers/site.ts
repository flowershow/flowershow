import { z } from "zod";
import { randomSlug } from "@/lib/random-slug";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { filePathsToPermalinks } from "@/lib/file-paths-to-permalinks";
import { githubFetch } from "@/lib/github";
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from "@/lib/domains";

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
      // generate random name
      let randomProjectName: string;
      do {
        randomProjectName = randomSlug();
      } while (
        await ctx.db.site.findFirst({
          where: { subdomain: randomProjectName },
        })
      );

      const response = ctx.db.site.create({
        data: {
          projectName: randomProjectName,
          gh_repository: input.gh_repository,
          gh_scope: input.gh_scope,
          gh_branch: input.gh_branch,
          user: { connect: { id: ctx.session.user.id } },
        },
      });

      revalidateTag(`user-${ctx.session.user.id}-sites`);

      return response;
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

      // revalidate list of sites in user dashboard
      revalidateTag(`user-${ctx.session.user.id}-sites`);
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

      const response = ctx.db.site.delete({
        where: { id: input.id },
      });
      // revalidate list of sites in user dashboard
      revalidateTag(`user-${ctx.session.user.id}-sites`);
      // revalidate the site metadata
      revalidateTag(`${site?.user?.gh_username}-${site?.projectName}-metadata`);

      // response.customDomain &&
      //   (await revalidateTag(`${site.customDomain}-metadata`));

      return response;
    }),
  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // don't cache this, it's used in the user dashboard
      return await ctx.db.site.findFirst({
        where: { id: input.id },
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
      // TODO should we only cache the GitHub API call? Or both? Or only the whole procedure?
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
              user: {
                include: {
                  accounts: true,
                },
              },
            },
          });

          if (!site) return null;

          const { gh_repository, gh_branch } = site;
          const access_token = site.user?.accounts[0]?.access_token; // ? TODO adjust prisma schema to 1:1 relationship between user and account, as we only support GitHub for now

          if (!access_token) {
            throw new Error(
              `No access token found for user ${site.user?.id} on site ${site.id}`,
            );
          }

          const filePaths = await fetchGitHubProjectFilePaths({
            gh_repository,
            gh_branch,
            access_token,
          });
          // TODO temporary solution for resolving paths to embedded images
          const ghRawUrl = `raw.githubusercontent.com/${gh_repository}/${gh_branch}`;
          // TODO temporary solution for relative URLs
          const siteUrl = `${input.gh_username}/${input.projectName}`;
          const permalinks = filePathsToPermalinks({
            filePaths,
            ghRawUrl,
            siteUrl: siteUrl,
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
            include: {
              user: {
                include: {
                  accounts: true,
                },
              },
            },
          });

          if (!site) return null;

          const { gh_repository, gh_branch } = site;
          const access_token = site.user?.accounts[0]?.access_token; // TODO ? adjust prisma schema to 1:1 relationship between user and account, as we only support GitHub for now

          if (!access_token) {
            throw new Error(
              `No access token found for user ${site.user?.id} on site ${site.id}`,
            );
          }

          let content: string | null = null;

          // if slug is empty, fetch index.md or README.md
          if (input.slug === "") {
            try {
              // fetch index.md
              content = await fetchGitHubFile({
                gh_repository,
                gh_branch,
                slug: "index.md",
                access_token,
              });
            } catch (error) {
              try {
                // fetch README.md
                content = await fetchGitHubFile({
                  gh_repository,
                  gh_branch,
                  slug: "README.md",
                  access_token,
                });
              } catch (error) {
                throw new Error(
                  `Could not read ${gh_repository}/index.md or ${gh_repository}/README.md on branch ${gh_branch} from GitHub: ${error}`,
                );
              }
            }
          } else {
            // fetch [slug].md or [slug]/index.md
            try {
              content = await fetchGitHubFile({
                gh_repository,
                gh_branch,
                slug: `${input.slug}.md`,
                access_token,
              });
            } catch (error) {
              try {
                content = await fetchGitHubFile({
                  gh_repository,
                  gh_branch,
                  slug: `${input.slug}/index.md`,
                  access_token,
                });
              } catch (error) {
                throw new Error(
                  `Could not read ${gh_repository}/${input.slug}.md or ${gh_repository}/${input.slug}/index.md on branch ${gh_branch} from GitHub: ${error}`,
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

async function fetchGitHubProjectFilePaths({
  gh_repository,
  gh_branch,
  access_token,
}: {
  gh_repository: string;
  gh_branch: string;
  access_token: string;
}) {
  let paths: string[] = [];

  try {
    const response = await githubFetch(
      `/repos/${gh_repository}/git/trees/${gh_branch}?recursive=1`,
      access_token,
      {
        next: {
          revalidate: 60, // 1 minute
          tags: [`${gh_repository}-${gh_branch}-tree`],
        },
      },
    );

    const responseJson = (await response.json()) as {
      tree: {
        path: string;
        type: "blob" | "tree";
      }[];
    };

    paths = responseJson.tree
      .filter((file) => file.type === "blob") // only include blobs (files) not trees (folders)
      .map((tree) => tree.path);
  } catch (error) {
    throw new Error(`Failed to fetch GitHub project paths: ${error}`);
  }

  return paths;
}

async function fetchGitHubFile({
  gh_repository,
  gh_branch,
  slug,
  access_token,
}: {
  gh_repository: string;
  gh_branch: string;
  slug: string;
  access_token: string;
}) {
  let content: string | null = null;

  try {
    const response = await githubFetch(
      `/repos/${gh_repository}/contents/${slug}?ref=${gh_branch}`,
      access_token,
      {
        next: {
          revalidate: 60, // 1 minute
          tags: [`${gh_repository}-${gh_branch}-${slug}`],
        },
      },
    );

    const responseJson = (await response.json()) as {
      content: string;
    };

    content = Buffer.from(responseJson.content, "base64").toString();
  } catch (error) {
    throw new Error(
      `Could not read ${gh_repository}/${slug} from GitHub: ${error}`,
    );
  }

  return content;
}
