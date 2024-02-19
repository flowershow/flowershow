import { z } from "zod";
import { randomSlug } from "@/lib/random-slug";
import { unstable_cache } from "next/cache";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { filePathsToPermalinks } from "@/lib/file-paths-to-permalinks";
import { githubFetch } from "../lib/github";
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

      //     await revalidateTag(
      //       `${subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`,
      //     );

      return ctx.db.site.create({
        data: {
          projectName: randomProjectName,
          gh_repository: input.gh_repository,
          gh_scope: input.gh_scope,
          gh_branch: input.gh_branch,
          user: { connect: { id: ctx.session.user.id } },
        },
      });
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
      console.log({ id, key, value });
      let response;

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
          /* Optional: remove domain from Vercel team

          // first, we need to check if the apex domain is being used by other sites
          const apexDomain = getApexDomain(`https://${site.customDomain}`);
          const domainCount = await ctx.db.site.count({
            where: {
              OR: [
                {
                  customDomain: apexDomain,
                },
                {
                  customDomain: {
                    endsWith: `.${apexDomain}`,
                  },
                },
              ],
            },
          });

          // if the apex domain is being used by other sites
          // we should only remove it from our Vercel project
          if (domainCount >= 1) {
            await removeDomainFromVercelProject(site.customDomain);
          } else {
            // this is the only site using this apex domain
            // so we can remove it entirely from our Vercel team
            await removeDomainFromVercelTeam(
              site.customDomain
            );
          }

          */
        }
      }

      // Handle other keys like 'image' or 'logo' here
      // Example for 'image' or 'logo':
      // else if (key === "image" || key === "logo") {
      //   if (!env.BLOB_READ_WRITE_TOKEN) {
      //     return {
      //       error:
      //         "Missing BLOB_READ_WRITE_TOKEN token. Note: Vercel Blob is currently in beta – please fill out this form for access: https://tally.so/r/nPDMNd",
      //     };
      //   }

      //   const file = formData.get(key) as File;
      //   const filename = `${nanoid()}.${file.type.split("/")[1]}`;

      //   const { url } = await put(filename, file, {
      //     access: "public",
      //   });

      //   const blurhash = key === "image" ? await getBlurDataURL(url) : null;

      //   response = await prisma.site.update({
      //     where: {
      //       id: site.id,
      //     },
      //     data: {
      //       [key]: url,
      //       ...(blurhash && { imageBlurhash: blurhash }),
      //     },
      //   });
      // }

      // If the key is not one of the special cases handled above, we update it directly
      // This assumes data contains other fields to update directly without special processing

      response = await ctx.db.site.update({
        where: { id },
        data: { [key]: value },
      });

      // if (error.code === "P2002") {
      //   return {
      //     error: `This ${key} is already taken`,
      //   };
      // }

      // console.log(
      //   "Updated site data! Revalidating tags: ",
      //   `${site.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`,
      //   `${site.customDomain}-metadata`,
      // );
      // await revalidateTag(
      //   `${site.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`,
      // );
      // site.customDomain &&
      //   (await revalidateTag(`${site.customDomain}-metadata`));

      return response;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // await revalidateTag(
      //   `${site.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`,
      // );
      // response.customDomain &&
      //   (await revalidateTag(`${site.customDomain}-metadata`));
      return ctx.db.site.delete({
        where: { id: input.id },
      });
    }),
  getUserSites: protectedProcedure
    .input(z.object({ limit: z.number().min(1).optional() }).optional())
    .query(({ ctx, input }) => {
      return ctx.db.site.findMany({
        where: { userId: ctx.session.user.id },
        take: input?.limit,
      });
    }),
  // PUBLIC
  // getAllDomains: publicProcedure
  //   .query(({ ctx }) => {
  //     return ctx.db.site.findMany({
  //       select: {
  //         subdomain: true,
  //         customDomain: true,
  //       },
  //     });
  //   }),
  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await unstable_cache(
        async () => {
          return await ctx.db.site.findFirst({
            where: { id: input.id },
          });
        },
        [`${input.id}-metadata`],
        {
          revalidate: 900, // 15 minutes
          tags: [`${input.id}-metadata`],
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
        [`${input.gh_username}-${input.projectName}-metadata`],
        {
          revalidate: 900, // 15 minutes
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
          revalidate: 1, // 15 minutes
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
      // return await unstable_cache(
      //   async () => {
      // find site by subdomain or custom domain
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
      //   },
      //   [`${input.domain}-${input.slug}`],
      //   {
      //     revalidate: 900, // 15 minutes
      //     tags: [`${input.domain}-${input.slug}`],
      //   },
      // )();
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
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch GitHub project paths: ${response.statusText}`,
      );
    }

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
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub file: ${response.statusText}`);
    }

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
