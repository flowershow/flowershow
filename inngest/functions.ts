import { inngest } from "./client";
import prisma from "@/server/db";
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
import { resolveFilePathToUrlPath } from "@/lib/resolve-file-path-to-url";
import { revalidateTag } from "next/cache";
import { isPathVisible } from "@/lib/path-validator";
import { SiteConfig } from "@/components/types";
import { Prisma } from "@prisma/client";

// Number of files to process in each batch
const BATCH_SIZE = 20;

export const syncSite = inngest.createFunction(
  {
    id: "sync",
    concurrency: [
      {
        scope: "account",
        limit: 5,
        key: "event.data.accessToken",
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
    const { siteId, ghRepository, ghBranch, rootDir, accessToken, forceSync } =
      event.data;

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
          url: `/repos/${ghRepository}/contents/config.json?ref=${ghBranch}`,
          accessToken: accessToken,
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
        ghRepository,
        ghBranch,
        accessToken,
      });

      return repoTree;
    });

    const normalizedRootDir = rootDir
      ? rootDir.replace(/^(.?\/)+|\/+$/g, "") + "/"
      : "";

    const fileBatchesToUpsert = await step.run(
      "get-file-batches-to-upsert",
      async () => {
        const existingBlobs = await prisma.blob.findMany({
          where: { siteId },
          select: { path: true, sha: true },
        });

        const blobShaMap = new Map(
          existingBlobs.map((blob) => [blob.path, blob.sha]),
        );

        console.log({ blobShaMap });

        const items = gitHubTree.tree
          .filter(
            (ghTreeItem) =>
              // Keep only files (not directories)
              ghTreeItem.type !== "tree" &&
              // Check if file is in the root directory
              ghTreeItem.path.startsWith(normalizedRootDir) &&
              // Validate against includes/excludes
              isPathVisible(ghTreeItem.path, includes, excludes),
          )
          .map((ghTreeItem) => {
            const filePath = ghTreeItem.path.replace(normalizedRootDir, "");
            return { ghTreeItem, filePath };
          })
          .filter(({ ghTreeItem, filePath }) => {
            // Include file if:
            // 1. It's not in the blob map (new file)
            // 2. SHA doesn't match (modified file)
            // 3. Force sync is enabled
            return (
              forceSync ||
              !blobShaMap.has(filePath) ||
              blobShaMap.get(filePath) !== ghTreeItem.sha
            );
          });

        type FileToUpsert = {
          ghTreeItem: GitHubAPIRepoTreeItem;
          filePath: string;
        };

        const fileBatches: FileToUpsert[][] = [];
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          fileBatches.push(items.slice(i, i + BATCH_SIZE));
        }

        return fileBatches;
      },
    );

    await Promise.all(
      fileBatchesToUpsert.map((batch, index) => {
        return step.run(`process-files-to-upsert-batch-${index}`, async () => {
          const processedFiles = await Promise.all(
            batch.map(async ({ ghTreeItem, filePath }) => {
              try {
                const extension = ghTreeItem.path.split(".").pop() || "";

                const gitHubFile = await fetchGitHubFileRaw({
                  ghRepository,
                  file_sha: ghTreeItem.sha,
                  accessToken,
                });

                await uploadFile({
                  projectId: siteId,
                  branch: ghBranch,
                  path: filePath,
                  content: Buffer.from(await gitHubFile.arrayBuffer()),
                  extension,
                });

                await prisma.blob.upsert({
                  where: {
                    siteId_path: {
                      siteId,
                      path: filePath,
                    },
                  },
                  create: {
                    siteId,
                    path: filePath,
                    appPath: ["md", "mdx"].includes(extension)
                      ? resolveFilePathToUrlPath(filePath)
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
                return { filePath, status: "SUCCESS", message: "" }; // Return path of successfully processed file
              } catch (error: any) {
                await prisma.blob.upsert({
                  where: {
                    siteId_path: {
                      siteId,
                      path: filePath,
                    },
                  },
                  create: {
                    siteId,
                    path: filePath,
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
                return { filePath, status: "ERROR", message: error };
              }
            }),
          );
          return processedFiles;
        });
      }),
    );

    const fileBatchesToDelete = await step.run(
      "get-file-batches-to-delete",
      async () => {
        // existing site files
        const existingBlobs = await prisma.blob.findMany({
          where: { siteId },
          select: { path: true, id: true },
        });

        // files that should be included in the site after sync
        const items = gitHubTree.tree
          .filter(
            (ghTreeItem) =>
              // Keep only files (not directories)
              ghTreeItem.type !== "tree" &&
              // Check if file is in the root directory
              ghTreeItem.path.startsWith(normalizedRootDir) &&
              // Validate against includes/excludes
              isPathVisible(ghTreeItem.path, includes, excludes),
          )
          .map((ghTreeItem) => ghTreeItem.path.replace(normalizedRootDir, ""));

        const filesToDelete = existingBlobs.filter(
          (blob) => !items.includes(blob.path),
        );

        const deleteBatches: (typeof filesToDelete)[] = [];
        for (let i = 0; i < filesToDelete.length; i += BATCH_SIZE) {
          deleteBatches.push(filesToDelete.slice(i, i + BATCH_SIZE));
        }

        return deleteBatches;
      },
    );

    await Promise.all(
      fileBatchesToDelete.map((batch, index) => {
        return step.run(`delete-files-batch-${index}`, async () => {
          const deletedFiles = await Promise.all(
            batch.map(async (blob) => {
              await deleteFile({
                projectId: siteId,
                branch: ghBranch,
                path: blob.path,
              });

              await deleteSiteDocument(siteId, blob.id);

              await prisma.blob.delete({
                where: {
                  id: blob.id,
                },
              });

              return blob.path;
            }),
          );
          return deletedFiles;
        });
      }),
    );

    await step.run("update-tree", async () =>
      prisma.site.update({
        where: { id: siteId },
        data: {
          tree: gitHubTree as any,
        },
      }),
    );

    // NOTE: this won't fully work (e.g. for getBlob) as part of the metadata is being updated in the db later, by the Cloudflare worker
    // still works for most site related cached data
    await step.run("revalidate-tags", async () => {
      revalidateTag(`${site.id}`);
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
        key: "event.data.accessToken",
      },
    ],
  },
  { event: "site/delete" },
  async ({ event }) => {
    const { siteId } = event.data;
    await deleteProject(siteId);
    await deleteSiteCollection(siteId);
  },
);
