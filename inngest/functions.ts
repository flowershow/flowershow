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
  GitHubAPIRepoTreeItem,
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  githubJsonFetch,
} from "@/lib/github";
import { resolveFilePathToUrl } from "@/lib/resolve-file-path-to-url";
import { revalidateTag } from "next/cache";
import { isPathVisible } from "@/lib/path-validator";
import { SiteConfig } from "@/components/types";
import { Prisma } from "@prisma/client";
import { BlogLayout } from "@portaljs/core";

export const syncSite = inngest.createFunction(
  {
    id: "sync",
    concurrency: [
      {
        scope: "account",
        limit: 5,
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
    const {
      contentInclude: includes = [],
      contentExclude: excludes = [],
    }: SiteConfig = await step.run("fetch-site-config", async () => {
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
        return {};
      }
    });

    await step.run("check-typesense-collection", async () => {
      const typesenseCollectionExists = await siteCollectionExists(siteId);
      if (!typesenseCollectionExists) {
        await createSiteCollection(siteId);
      }
    });

    // Fetch latest GitHub repository tree
    const gitHubTree = await step.run("fetch-github-tree", async () => {
      const repoTree = await fetchGitHubRepoTree({
        gh_repository,
        gh_branch,
        access_token,
      });

      return repoTree;
    });

    const normalizedRootDir = normalizeDir(rootDir || null);

    const filesToUpdate = await step.run("get-files-to-update", async () => {
      // Get all existing blobs for this site
      const existingBlobs = await prisma.blob.findMany({
        where: { siteId },
        select: { path: true, sha: true },
      });

      // Create a map of path -> sha for quick lookup
      const blobMap = new Map(
        existingBlobs.map((blob) => [blob.path, blob.sha]),
      );

      // Filter and map tree items that need updating
      const items = gitHubTree.tree
        .filter(
          (file) =>
            // Keep only files (not directories)
            file.type !== "tree" &&
            // Check if file is in the root directory
            file.path.startsWith(normalizedRootDir) &&
            // Validate against includes/excludes
            isPathVisible(file.path, includes, excludes),
        )
        .map((ghTreeItem) => {
          const contentStorePath = ghTreeItem.path.replace(
            normalizedRootDir,
            "",
          );
          return { ghTreeItem, contentStorePath };
        })
        .filter(({ ghTreeItem, contentStorePath }) => {
          // Include file if:
          // 1. It's not in the blob map (new file)
          // 2. SHA doesn't match (modified file)
          // 3. Force sync is enabled
          return (
            forceSync ||
            !blobMap.has(contentStorePath) ||
            blobMap.get(contentStorePath) !== ghTreeItem.sha
          );
        });

      return items as {
        ghTreeItem: GitHubAPIRepoTreeItem;
        contentStorePath: string;
      }[];
    });

    const updateFilesPromises = filesToUpdate.map(
      ({ ghTreeItem, contentStorePath }) => {
        return step.run(`sync-blob-${ghTreeItem.path}`, async () => {
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
        });
      },
    );

    await Promise.all(updateFilesPromises);

    const filesToDelete = await step.run("get-files-to-delete", async () => {
      // Get all valid files from GitHub tree
      const validGitHubPaths = gitHubTree.tree
        .filter(
          (file) =>
            file.type !== "tree" &&
            file.path.startsWith(normalizedRootDir) &&
            isPathVisible(file.path, includes, excludes),
        )
        .map((file) => file.path.replace(normalizedRootDir, ""));

      // Get all files from database
      const existingBlobs = await prisma.blob.findMany({
        where: { siteId },
        select: { path: true, id: true },
      });

      // Return blobs that don't exist in GitHub tree anymore
      return existingBlobs.filter(
        (blob) => !validGitHubPaths.includes(blob.path),
      );
    });

    const deletePromises = filesToDelete.map((blob) => {
      return step.run(`delete-blob-${blob.path}`, async () => {
        await deleteFile({
          projectId: siteId,
          branch: gh_branch,
          path: blob.path,
        });

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
        limit: 5,
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
