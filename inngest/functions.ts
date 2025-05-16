import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/server/db";
import { normalizeDir } from "@/lib/utils";
import { deleteFile, deleteProject, uploadFile } from "@/lib/content-store";
import {
  createSiteCollection,
  deleteSiteCollection,
  deleteSiteDocument,
  siteCollectionExists,
} from "@/lib/typesense";
import {
  GitHubAPIFileContent,
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  githubJsonFetch,
} from "@/lib/github";
import { resolveFilePathToUrl } from "@/lib/resolve-file-path-to-url";
import { revalidateTag } from "next/cache";
import { isPathVisible } from "@/lib/path-validator";
import { SiteConfig } from "@/components/types";
import { Prisma } from "@prisma/client";

export const syncSite = inngest.createFunction(
  {
    id: "sync",
    concurrency: [
      {
        scope: "account",
        limit: 10,
        key: "event.data.access_token",
      },
    ],
    cancelOn: [
      {
        event: "site/delete",
        if: "async.data.siteId == event.data.siteId",
      },
      {
        event: "site/sync",
        if: "async.data.siteId == event.data.siteId",
      },
    ],
  },
  { event: "site/sync" },
  async ({ event, step }) => {
    const {
      siteId,
      gh_repository,
      gh_branch,
      rootDir,
      access_token,
      forceSync,
    } = event.data;

    const site = await step.run("fetch-site", async () => {
      const site = await prisma.site.findUnique({
        where: { id: siteId },
        include: { user: true },
      });

      if (!site) {
        throw Error(`Site ${siteId} not found.`);
      }

      return site;
    });

    // Fetch site config to get contentInclude and contentExclude settings
    const siteConfig: SiteConfig = await step.run(
      "fetch-site-config",
      async () => {
        try {
          const config = await githubJsonFetch<GitHubAPIFileContent>({
            url: `/repos/${gh_repository}/contents/config.json?ref=${gh_branch}`,
            accessToken: access_token,
            cacheOptions: {
              cache: "no-store",
            },
          });
          return JSON.parse(
            Buffer.from(config.content, "base64").toString("utf-8"),
          );
        } catch (e: any) {
          if (e.code == "NOT_FOUND") {
            return {};
          }
          throw new NonRetriableError(
            "Failed to fetch site's config.json file.",
            {
              cause: e,
            },
          );
        }
      },
    );

    const typesenseCollectionExists = await siteCollectionExists(siteId);

    if (!typesenseCollectionExists) {
      await createSiteCollection(siteId);
    }

    const includes: string[] = siteConfig?.contentInclude || [];
    const excludes: string[] = siteConfig?.contentExclude || [];

    // Fetch latest GitHub repository tree
    const gitHubTree = await step.run("fetch-github-tree", async () => {
      const repoTree = await fetchGitHubRepoTree({
        gh_repository,
        gh_branch,
        access_token,
      });

      if (rootDir) {
        const normalizedRootDir = normalizeDir(rootDir);
        const rootDirExists = repoTree.tree.some(
          (treeItem) =>
            treeItem.type === "tree" &&
            treeItem.path === normalizedRootDir.slice(0, -1),
        );

        if (!rootDirExists) {
          throw new NonRetriableError("INVALID_ROOT_DIR");
        }
      }

      return repoTree;
    });

    const normalizedRootDir = normalizeDir(rootDir || null);
    const targetSiteItems = gitHubTree.tree
      .filter(
        (file) =>
          file.type !== "tree" &&
          file.path.startsWith(normalizedRootDir) &&
          isPathVisible(file.path, includes, excludes),
      )
      .map((ghTreeItem) => {
        const contentStorePath = ghTreeItem.path.replace(normalizedRootDir, "");
        return { ghTreeItem, contentStorePath };
      });

    // Process files in GitHub tree
    const promises = targetSiteItems.map(
      async ({ ghTreeItem, contentStorePath }, index) => {
        try {
          const blob = await prisma.blob.findUnique({
            where: {
              siteId_path: {
                siteId,
                path: contentStorePath,
              },
            },
          });

          // Skip if SHA matches and force sync is not enabled
          if (!forceSync && blob && blob.sha === ghTreeItem.sha) {
            return;
          }

          // Only create a step for files that need processing
          await step.run(`sync-blob-${ghTreeItem.path}`, async () => {
            const extension = ghTreeItem.path.split(".").pop() || "";

            const gitHubFile = await fetchGitHubFileRaw({
              gh_repository,
              file_sha: ghTreeItem.sha,
              access_token,
            });

            const content = Buffer.from(await gitHubFile.arrayBuffer());

            await uploadFile({
              projectId: siteId,
              branch: gh_branch,
              path: contentStorePath,
              content,
              extension,
            });

            await prisma.blob.upsert({
              where: {
                siteId_path: {
                  siteId,
                  path: contentStorePath,
                },
              },
              create: {
                siteId,
                path: contentStorePath,
                appPath: ["md", "mdx"].includes(extension)
                  ? resolveFilePathToUrl(contentStorePath)
                  : null,
                size: ghTreeItem.size || 0,
                sha: ghTreeItem.sha,
                metadata: Prisma.JsonNull,
                extension,
                syncStatus: ["md", "mdx"].includes(extension)
                  ? "PENDING"
                  : "SUCCESS",
              },
              update: {
                size: ghTreeItem.size || 0,
                sha: ghTreeItem.sha,
              },
            });
          });
        } catch (error: any) {
          await prisma.blob.upsert({
            where: {
              siteId_path: {
                siteId,
                path: contentStorePath,
              },
            },
            create: {
              siteId,
              path: contentStorePath,
              size: 0,
              sha: "",
              metadata: Prisma.JsonNull,
              syncStatus: "ERROR",
              syncError: error.message,
            },
            update: {
              syncStatus: "ERROR",
              syncError: error.message,
            },
          });
        }
      },
    );

    await Promise.all(promises);

    const existingBlobs = await prisma.blob.findMany({
      where: { siteId },
      select: { path: true, id: true },
    });

    const targetSiteItemsPaths = targetSiteItems.map(
      (item) => item.contentStorePath,
    );

    const deletePromises = existingBlobs
      .filter((blob) => !targetSiteItemsPaths.includes(blob.path))
      .map(async (blob, index) => {
        await step.run(`delete-blob-${index}`, async () => {
          await deleteFile({
            projectId: siteId,
            branch: gh_branch,
            path: blob.path,
          });

          // Delete the document from Typesense if it exists
          await deleteSiteDocument(siteId, blob.id);

          await prisma.blob.delete({
            where: {
              id: blob.id,
            },
          });
        });
      });

    await Promise.all(deletePromises);

    await step.run("update-tree", async () =>
      prisma.site.update({
        where: { id: siteId },
        data: {
          tree: gitHubTree as any,
        },
      }),
    );

    await step.run("revalidate-tags", async () => {
      revalidateTag(`${site!.user?.gh_username}-${site!.projectName}-metadata`);
      revalidateTag(
        `${site!.user?.gh_username}-${site!.projectName}-permalinks`,
      );
      revalidateTag(`${site?.user?.gh_username}-${site?.projectName}-tree`);
      revalidateTag(
        `${site!.user?.gh_username}-${site!.projectName}-page-content`,
      );
    });
  },
);

export const deleteSite = inngest.createFunction(
  {
    id: "delete",
    concurrency: [
      {
        scope: "account",
        limit: 10,
        key: "event.data.access_token",
      },
    ],
  },
  { event: "site/delete" },
  async ({ event }) => {
    const { siteId } = event.data;
    // Delete from content store first
    await deleteProject(siteId);
    await deleteSiteCollection(siteId);
  },
);
