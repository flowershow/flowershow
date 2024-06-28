import { NonRetriableError } from "inngest";
import YAML from "yaml";

import { inngest } from "./client";
import prisma from "@/server/db";
import { normalizeDir } from "@/server/api/routers/site";
import { DataPackage } from "@/components/layouts/datapackage-types";
import { env } from "@/env.mjs";
import {
  deleteFile,
  deleteProject,
  fetchTree,
  uploadFile,
  uploadTree,
} from "@/lib/content-store";
import {
  fetchGitHubFile,
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
} from "@/lib/github";
import { computeMetadata, resolveFilePathToUrl } from "@/lib/computed-fields";
import {
  SupportedExtension,
  isSupportedExtension,
  isSupportedMarkdownExtension,
} from "@/lib/types";
import { revalidateTag } from "next/cache";

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
    onFailure: async ({ event, step }) => {
      await step.run(
        "update-sync-status",
        async () =>
          await prisma.site.update({
            where: { id: event.data.event.data.siteId }, // TODO this can't be right
            data: { syncStatus: "ERROR" },
          }),
      );
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

    if (!site) {
      throw new NonRetriableError("Site does not exist");
    }

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
      async () =>
        initialSync || forceSync ? null : await fetchTree(siteId, gh_branch),
    );

    const gitHubTree = await step.run(
      "fetch-github-tree",
      async () =>
        await fetchGitHubRepoTree({
          gh_repository,
          gh_branch,
          access_token,
        }),
    );

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
        // TODO this will make any changes to datapackage.json files be skipped
        // if README.md hasn't changed as well
        if (
          contentStoreTreeItems.has(path) &&
          contentStoreTreeItems.get(path) === sha
        ) {
          return null;
        }

        // check if the file is already in the content store and hasn't changed
        // fetch and upload the file content to the content store
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

          if (isSupportedMarkdownExtension(fileExtension)) {
            const markdown = await gitHubFileBlob.text();

            // special case for README.md and index.md files
            let datapackage: DataPackage | null = null;
            if (path.endsWith("README.md") || path.endsWith("index.md")) {
              let fileDir = path.split("/").slice(0, -1).join("/");
              fileDir = fileDir ? `${fileDir}/` : "";

              const datapackageTreeItem =
                // TODO probably should look for the file in the map isntead
                gitHubTree.tree.find((f) => {
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
                  datapackage = JSON.parse(
                    datapackageContentString,
                  ) as DataPackage;
                } else if (
                  datapackageFileExtension === "yaml" ||
                  datapackageFileExtension === "yml"
                ) {
                  datapackage = YAML.parse(
                    datapackageContentString,
                  ) as DataPackage; // datapackageContent is base64 encoded, so we need to decode it
                }
              }
            }

            const metadata = await computeMetadata({
              source: markdown,
              datapackage,
              path: contentStoreFilePath,
              tree: gitHubTree,
              contentStoreUrlBase: `https://${
                env.NEXT_PUBLIC_R2_BUCKET_DOMAIN
              }/${site!.id}/${site!.gh_branch}/raw`,
            });

            return { metadata };
          }

          return null;
        });

        if (fileMetadata?.metadata) {
          filesMetadata[fileMetadata.metadata._url] = fileMetadata.metadata;
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
