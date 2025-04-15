import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/server/db";
import { normalizeDir } from "@/lib/utils";
import { deleteFile, deleteProject, uploadFile } from "@/lib/content-store";
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
    const { siteId, gh_repository, gh_branch, rootDir, access_token } =
      event.data;

    const site = await step.run(
      "fetch-site",
      async () =>
        await prisma.site.findUnique({
          where: { id: siteId },
          include: { user: true },
        }),
    );

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

    // Process files in GitHub tree
    const promises = gitHubTree.tree
      .filter(
        (file) =>
          file.type !== "tree" &&
          file.path.startsWith(normalizedRootDir) &&
          isPathVisible(file.path, includes, excludes),
      )
      .map(async (file, index) => {
        const contentStorePath = file.path.replace(normalizedRootDir, "");

        try {
          // Update or create blob
          await step.run(`update-blob-${index}`, async () => {
            const extension = file.path.split(".").pop() || "";

            return await prisma.blob.upsert({
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
                size: file.size || 0,
                sha: file.sha,
                metadata: {}, // Empty metadata for now
                extension,
              },
              update: {
                size: file.size || 0,
                sha: file.sha,
                syncStatus: "PENDING",
              },
            });
          });

          // Upload file content to S3 storage
          await step.run(`upload-file-${index}`, async () => {
            const gitHubFileBlob = await fetchGitHubFileRaw({
              gh_repository,
              file_sha: file.sha,
              access_token,
            });

            const content = Buffer.from(await gitHubFileBlob.arrayBuffer());
            const fileExtension = file.path.split(".").pop() || "";

            await uploadFile({
              projectId: siteId,
              branch: gh_branch,
              path: contentStorePath,
              content,
              extension: fileExtension,
            });

            // Non-markdown files don't require further processing, so set their syncStatus to SUCCESS
            if (!["md", "mdx"].includes(fileExtension)) {
              await prisma.blob.update({
                where: {
                  siteId_path: {
                    siteId,
                    path: contentStorePath,
                  },
                },
                data: {
                  syncStatus: "SUCCESS",
                },
              });
            }
          });
        } catch (error: any) {
          await prisma.blob.update({
            where: {
              siteId_path: {
                siteId,
                path: contentStorePath,
              },
            },
            data: {
              syncStatus: "ERROR",
              syncError: error.message,
            },
          });
        }
      });

    await Promise.all(promises);

    // Delete files and blobs that no longer exist in GitHub
    await step.run("delete-removed-files", async () => {
      const removedPaths = gitHubTree.tree
        .filter((file) => file.type !== "tree")
        .map((file) => file.path.replace(normalizedRootDir, ""));

      // Delete from content store
      const existingBlobs = await prisma.blob.findMany({
        where: { siteId },
        select: { path: true },
      });

      const deletePromises = existingBlobs
        .filter((blob) => !removedPaths.includes(blob.path))
        .map((blob) =>
          deleteFile({
            projectId: siteId,
            branch: gh_branch,
            path: blob.path,
          }),
        );

      await Promise.all(deletePromises);

      // Delete from database
      await prisma.blob.deleteMany({
        where: {
          siteId,
          path: {
            notIn: removedPaths,
          },
        },
      });
    });

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
  },
);
