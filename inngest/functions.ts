import { NonRetriableError } from "inngest";
import YAML from "yaml";

import { inngest } from "./client";
import prisma from "@/server/db";
import { Prisma } from "@prisma/client";
import { normalizeDir } from "@/server/api/routers/site";
import { DataPackage } from "@/components/layouts/datapackage-types";
import {
  deleteFile,
  deleteProject,
  fetchTree,
  uploadFile,
  uploadTree,
} from "@/lib/content-store";
import {
  GitHubAPIFileContent,
  fetchGitHubFile,
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  githubJsonFetch,
} from "@/lib/github";
import { computeMetadata, resolveFilePathToUrl } from "@/lib/computed-fields";
import {
  SupportedExtension,
  SyncError,
  isSupportedExtension,
  isSupportedMarkdownExtension,
} from "@/lib/types";
import { revalidateTag } from "next/cache";
import { isPathVisible } from "@/lib/path-validator";
import { SiteConfig } from "@/components/types";

const parseDataPackage = (content: string, extension: string): DataPackage => {
  if (extension === "json") {
    return JSON.parse(content) as DataPackage;
  } else if (extension === "yaml" || extension === "yml") {
    return YAML.parse(content) as DataPackage; // datapackageContent is base64 encoded, so we need to decode it
  }
  throw new NonRetriableError("Unsupported data package format");
};

const getFileDir = (path: string): string => {
  const fileDir = path.substring(0, path.lastIndexOf("/") + 1);
  return fileDir;
};

// TODO handle different types of errors when fetching from GH or uploading to CS
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
    // retries: 2,
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
    onFailure: async ({ error, event, step }) => {
      await step.run("update-sync-status", async () => {
        // const errorType = isKnownSyncErrorType(error.message) ? error.message : "INTERNAL_ERROR";
        if (error.message !== "MARKDOWN_PARSING_ERROR") {
          const syncError: SyncError = {
            datetime: new Date().toISOString(),
            type: "INTERNAL_ERROR",
            // message: error.cause as string ?? error.message,
            message: error.message,
            error: JSON.stringify(error),
          };
          await prisma.site.update({
            where: { id: event.data.event.data.siteId }, // TODO this can't be right
            data: {
              syncStatus: "ERROR",
              syncError: syncError as any, // TODO fix types
            },
          });
        }
      });
    },
  },
  { event: "site/sync" },
  async ({ event, step }) => {
    const {
      siteId,
      gh_repository,
      gh_branch,
      rootDir,
      access_token,
      initialSync = false,
      forceSync = false,
    } = event.data;

    const site = await step.run(
      "fetch-site",
      async () =>
        await prisma.site.findUnique({
          where: { id: siteId },
          include: { user: true },
        }),
    );

    const siteConfig: SiteConfig = await step.run(
      "fetch-site-config",
      async () => {
        try {
          const config = await githubJsonFetch<GitHubAPIFileContent>({
            // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#get-repository-content
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

    await step.run(
      "update-sync-status",
      async () =>
        await prisma.site.update({
          where: { id: siteId },
          data: { syncStatus: "PENDING" },
        }),
    );

    const contentStoreTree = await step.run(
      "fetch-content-store-tree",
      async () => {
        if (initialSync || forceSync) {
          return null;
        }
        try {
          return await fetchTree(siteId, gh_branch);
        } catch (error: any) {
          if (error.name === "NoSuchKey") {
            return null;
          }
          throw error;
        }
      },
    );

    const gitHubTree = await step.run("fetch-github-tree", async () => {
      const repoTree = await fetchGitHubRepoTree({
        gh_repository,
        gh_branch,
        access_token,
      });
      return {
        ...repoTree,
        tree: repoTree.tree.filter((file) =>
          isPathVisible(file.path, includes, excludes),
        ),
      };
    });

    if (contentStoreTree && contentStoreTree.sha === gitHubTree.sha) {
      await step.run(
        "update-sync-status",
        async () =>
          await prisma.site.update({
            where: { id: siteId },
            data: { syncStatus: "SUCCESS" },
          }),
      );
      return {
        event,
        body: "No changes detected",
      };
    }

    const filesMetadata = await step.run("get-files-metadata", async () => {
      const filesMetadata = await prisma.site.findUnique({
        where: { id: siteId },
        select: { files: true },
      });
      return filesMetadata?.files || {};
    });

    // adjust user input to be comparable to file paths from GitHub API tree
    // it's used to filter out files that are not in the rootDir
    const normalizedRootDir = normalizeDir(rootDir || null);

    // if previousTree is not provided, the map will be empty
    const contentStoreTreeItems = new Map(
      contentStoreTree?.tree
        .filter((file) => {
          if (file.type === "tree") return false;
          if (!isSupportedExtension(file.path.split(".").pop() || ""))
            return false;
          return file.path.startsWith(normalizedRootDir);
        })
        .map((file) => [file.path, file.sha] || []),
    );

    const gitHubTreeItems = new Map(
      gitHubTree.tree
        .filter((file) => {
          if (file.type === "tree") return false;
          if (!isSupportedExtension(file.path.split(".").pop() || ""))
            return false;
          return file.path.startsWith(normalizedRootDir);
        })
        .map((file) => [file.path, file.sha]),
    );

    const promises = Array.from(gitHubTreeItems.entries()).map(
      async ([path, sha]) => {
        if (
          contentStoreTreeItems.has(path) &&
          contentStoreTreeItems.get(path) === sha
        ) {
          return null;
        }

        const fileExtension = path.split(".").pop() as SupportedExtension; // files with unsupported extensions were filtered out earlier

        const contentStoreFilePath = path.replace(normalizedRootDir, "");

        const fileMetadata = await step.run("process-file", async () => {
          const gitHubFileBlob = await fetchGitHubFileRaw({
            gh_repository,
            file_sha: sha,
            access_token,
          });

          await uploadFile({
            projectId: siteId,
            branch: gh_branch,
            path: contentStoreFilePath,
            content: Buffer.from(await gitHubFileBlob.arrayBuffer()),
            extension: fileExtension,
          });

          let markdownFilePath = contentStoreFilePath;
          let markdown: string;
          let datapackage: DataPackage | null = null;

          if (isSupportedMarkdownExtension(fileExtension)) {
            // if it's a markdown file, process it

            markdown = await gitHubFileBlob.text();

            // if it's a README.md or index.md file, find the datapackage file in the same directory (if it exists)
            if (path.endsWith("README.md") || path.endsWith("index.md")) {
              const fileDir = getFileDir(path);

              const datapackageTreeItem = gitHubTree.tree.find((f) =>
                new RegExp(`${fileDir}datapackage\\.(json|ya?ml)$`).test(
                  f.path,
                ),
              );

              if (datapackageTreeItem) {
                const datapackageGitHubFile = await fetchGitHubFile({
                  gh_repository,
                  gh_branch,
                  access_token,
                  path: datapackageTreeItem.path,
                });

                const datapackageFileExtension = datapackageTreeItem.path
                  .split(".")
                  .pop() as SupportedExtension; // json, yaml, and yml are supported

                const datapackageContentString = Buffer.from(
                  datapackageGitHubFile.content,
                  "base64",
                ).toString("utf-8");

                datapackage = parseDataPackage(
                  datapackageContentString,
                  datapackageFileExtension,
                );
              }
            }
          } else if (path.match(/datapackage\.(json|ya?ml)$/)) {
            // if it's a datapackage file, find the README.md or index.md file in the same directory
            // TODO there should be a better way to do this
            // TODO it's possible that the datapackage has already been processed with the README.md or index.md file above
            // so would be good to avoid processing it again

            const fileDir = getFileDir(path);

            const readmeTreeItem = gitHubTree.tree.find((f) => {
              return (
                f.path === `${fileDir}README.md` ||
                f.path === `${fileDir}index.md`
              );
            });

            // if README.md or index.md file is not found, skip processing the datapackage file
            if (!readmeTreeItem) {
              return null;
            }

            const readmeGitHubFileBlob = await fetchGitHubFileRaw({
              gh_repository,
              file_sha: readmeTreeItem.sha,
              access_token,
            });

            markdown = await readmeGitHubFileBlob.text();
            markdownFilePath = readmeTreeItem.path.replace(
              normalizedRootDir,
              "",
            );

            const datapackageContentString = await gitHubFileBlob.text();
            datapackage = parseDataPackage(
              datapackageContentString,
              fileExtension,
            );
          } else {
            // if it's not a markdown or datapackage file, just upload the file and return
            return null;
          }

          try {
            const metadata = await computeMetadata({
              source: markdown,
              datapackage,
              path: markdownFilePath,
              tree: gitHubTree,
            });

            return { metadata };
          } catch (error: any) {
            if (error.name === "YAMLException") {
              // TODO this is temporary as I couldn't get read the passed {cause: error} in the onFailed handler
              // See post in inngest discord forum https://discord.com/channels/842170679536517141/1265692893117550768
              const syncError: SyncError = {
                datetime: new Date().toISOString(),
                type: "MARKDOWN_PARSING_ERROR",
                message: `Failed to parse YAML frontmatter in ${contentStoreFilePath}: ${error.message}`,
                error: JSON.stringify(error),
              };

              await prisma.site.update({
                where: { id: site!.id }, // TODO this can't be right
                data: {
                  syncStatus: "ERROR",
                  syncError: syncError as any, // TODO fix types
                },
              });

              // Only this should be needed and the above should be removed but
              // I couldn't get the error to be passed to the onFailure handler
              // also, currently the original error is not visible in inngest logs ...
              throw new NonRetriableError("MARKDOWN_PARSING_ERROR", {
                cause: error,
              });
            }
          }
        });

        if (fileMetadata?.metadata) {
          if (!fileMetadata.metadata?.isDraft)
            filesMetadata[fileMetadata.metadata._url] = fileMetadata.metadata;
          else delete filesMetadata[fileMetadata.metadata._url];
        }
      },
    );

    await Promise.all(promises);

    // check for deleted files in GitHub
    const deletePromises = Array.from(contentStoreTreeItems.entries()).map(
      async ([path]) => {
        if (!gitHubTreeItems.has(path)) {
          // the file exists in the content store but not in GitHub, so delete it from the content store
          const contentStorePath = path.replace(normalizedRootDir, "");

          await step.run(
            "delete-content-store-file",
            async () =>
              await deleteFile({
                projectId: siteId,
                branch: gh_branch,
                path: contentStorePath,
              }),
          );

          const deletedFileUrl = resolveFilePathToUrl(contentStorePath);
          delete filesMetadata[deletedFileUrl];

          // if the deleted file is a datapackage file, re-compute the metadata for the README.md or index.md file in the same directory
          if (path.match(/datapackage\.(json|ya?ml)$/)) {
            const fileDir = getFileDir(path);

            const readmeTreeItem = gitHubTree.tree.find((f) => {
              return (
                f.path === `${fileDir}README.md` ||
                f.path === `${fileDir}index.md`
              );
            });

            if (readmeTreeItem) {
              const readmeGitHubFileBlob = await fetchGitHubFileRaw({
                gh_repository,
                file_sha: readmeTreeItem.sha,
                access_token,
              });

              const markdown = await readmeGitHubFileBlob.text();
              const markdownFilePath = readmeTreeItem.path.replace(
                normalizedRootDir,
                "",
              );

              const metadata = await computeMetadata({
                source: markdown,
                datapackage: null,
                path: markdownFilePath,
                tree: gitHubTree,
              });

              filesMetadata[metadata._url] = metadata;
            }
          }
        }
      },
    );

    await Promise.all(deletePromises);

    await step.run(
      "upload-content-store-tree",
      async () =>
        await uploadTree({
          projectId: siteId,
          branch: gh_branch,
          tree: gitHubTree,
        }),
    );

    await step.run(
      "update-sync-status",
      async () =>
        await prisma.site.update({
          where: { id: siteId },
          data: {
            files: filesMetadata as any, // TODO: fix types
            syncStatus: "SUCCESS",
            syncError: Prisma.DbNull,
            syncedAt: new Date(),
          },
        }),
    );

    // TODO does this even work
    await step.run("revalidate-tags", async () => {
      // revalidate the site metadata
      revalidateTag(`${site!.user?.gh_username}-${site!.projectName}-metadata`);
      // revalidatee the site's permalinks
      revalidateTag(
        `${site!.user?.gh_username}-${site!.projectName}-permalinks`,
      );
      // revalidate the site tree
      revalidateTag(`${site?.user?.gh_username}-${site?.projectName}-tree`);
      // revalidate all the pages' content
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
    // retries: 2,
  },
  { event: "site/delete" },
  async ({ event, step }) => {
    const { siteId } = event.data;

    await step.run(
      "delete-site-from-content-store",
      async () => await deleteProject(siteId),
    );
  },
);
