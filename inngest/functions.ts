import { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { SiteConfig } from '@/components/types';
import { deleteFile, deleteProject, uploadFile } from '@/lib/content-store';
import {
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  GitHubAPIFileContent,
  GitHubAPIRepoTreeItem,
  getInstallationToken,
  githubJsonFetch,
} from '@/lib/github';
import { isPathVisible } from '@/lib/path-validator';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import {
  createSiteCollection,
  deleteSiteCollection,
  deleteSiteDocument,
  siteCollectionExists,
} from '@/lib/typesense';
import prisma from '@/server/db';
import { inngest } from './client';

// Number of files to process in each batch
const BATCH_SIZE = 20;

export const syncSite = inngest.createFunction(
  {
    id: 'sync',
    concurrency: [
      {
        scope: 'account',
        limit: 5,
        key: 'event.data.accessToken || event.data.installationId',
      },
    ],
    cancelOn: [
      {
        event: 'site/delete',
        if: 'async.data.siteId == event.data.siteId',
      },
      {
        event: 'site/sync',
        if: 'async.data.siteId == event.data.siteId',
      },
    ],
  },
  { event: 'site/sync' },
  async ({ event, step }) => {
    const {
      siteId,
      ghRepository,
      ghBranch,
      rootDir,
      accessToken,
      installationId,
      forceSync,
    } = event.data;

    const site = await step.run('fetch-site', async () => {
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
    }: SiteConfig = await step.run('fetch-site-config', async () => {
      try {
        // Use installation token if available, otherwise use OAuth token
        const token = installationId
          ? await getInstallationToken(installationId)
          : accessToken;

        const config = await githubJsonFetch<GitHubAPIFileContent>({
          url: `/repos/${ghRepository}/contents/config.json?ref=${ghBranch}`,
          accessToken: token,
          cacheOptions: {
            cache: 'no-store',
          },
        });
        return JSON.parse(
          Buffer.from(config.content, 'base64').toString('utf-8'),
        );
      } catch (e: any) {
        return {};
      }
    });

    await step.run('check-typesense-collection', async () => {
      const typesenseCollectionExists = await siteCollectionExists(siteId);
      if (!typesenseCollectionExists) {
        await createSiteCollection(siteId);
      }
    });

    // Fetch latest GitHub repository tree
    const gitHubTree = await step.run('fetch-github-tree', async () => {
      const repoTree = await fetchGitHubRepoTree({
        ghRepository,
        ghBranch,
        accessToken,
        installationId,
      });

      return repoTree;
    });

    const normalizedRootDir = rootDir
      ? rootDir.replace(/^(.?\/)+|\/+$/g, '') + '/'
      : '';

    const fileBatchesToUpsert = await step.run(
      'get-file-batches-to-upsert',
      async () => {
        const existingBlobs = await prisma.blob.findMany({
          where: { siteId },
          select: { path: true, sha: true },
        });

        const blobShaMap = new Map(
          existingBlobs.map((blob) => [blob.path, blob.sha]),
        );

        const items = gitHubTree.tree
          .filter(
            (ghTreeItem) =>
              // Keep only files (not directories)
              ghTreeItem.type !== 'tree' &&
              // Check if file is in the root directory
              ghTreeItem.path.startsWith(normalizedRootDir) &&
              // Validate against includes/excludes
              isPathVisible(ghTreeItem.path, includes, excludes),
          )
          .map((ghTreeItem) => {
            const filePath = ghTreeItem.path.replace(normalizedRootDir, '');
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
                const extension = ghTreeItem.path.split('.').pop() || '';

                const gitHubFile = await fetchGitHubFileRaw({
                  ghRepository,
                  file_sha: ghTreeItem.sha,
                  accessToken,
                  installationId,
                });

                await uploadFile({
                  projectId: siteId,
                  branch: ghBranch,
                  path: filePath,
                  content: Buffer.from(await gitHubFile.arrayBuffer()),
                  extension,
                });

                const urlPath = (() => {
                  if (['md', 'mdx'].includes(extension)) {
                    const _urlPath = resolveFilePathToUrlPath({
                      target: filePath,
                    });
                    // TODO dirty, temporary patch; instead, make sure all appPaths in the db start with / (currently only root is / 🤦‍♀️)
                    return _urlPath === '/'
                      ? _urlPath
                      : _urlPath.replace(/^\//, '');
                  } else {
                    return null;
                  }
                })();

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
                    appPath: urlPath,
                    size: ghTreeItem.size || 0,
                    sha: ghTreeItem.sha,
                    metadata: Prisma.JsonNull,
                    extension,
                    syncStatus: ['md', 'mdx'].includes(extension)
                      ? 'PROCESSING'
                      : 'SUCCESS',
                  },
                  update: {
                    size: ghTreeItem.size || 0,
                    sha: ghTreeItem.sha,
                  },
                });
                return { filePath, status: 'SUCCESS', message: '' }; // Return path of successfully processed file
              } catch (error: any) {
                console.error(error);

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
                    sha: '',
                    metadata: Prisma.JsonNull,
                    syncStatus: 'ERROR',
                    syncError: error.message,
                  },
                  update: {
                    syncStatus: 'ERROR',
                    syncError: error.message,
                  },
                });
                return { filePath, status: 'ERROR', message: error };
              }
            }),
          );
          return processedFiles;
        });
      }),
    );

    const fileBatchesToDelete = await step.run(
      'get-file-batches-to-delete',
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
              ghTreeItem.type !== 'tree' &&
              // Check if file is in the root directory
              ghTreeItem.path.startsWith(normalizedRootDir) &&
              // Validate against includes/excludes
              isPathVisible(ghTreeItem.path, includes, excludes),
          )
          .map((ghTreeItem) => ghTreeItem.path.replace(normalizedRootDir, ''));

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

    await step.run('update-tree', async () =>
      prisma.site.update({
        where: { id: siteId },
        data: {
          tree: gitHubTree as any,
        },
      }),
    );

    // NOTE: this won't fully work (e.g. for getBlob) as part of the metadata is being updated in the db later, by the Cloudflare worker
    // still works for most site related cached data
    await step.run('revalidate-tags', async () => {
      revalidateTag(`${site.id}`);
    });
  },
);

export const deleteSite = inngest.createFunction(
  {
    id: 'delete',
    concurrency: [
      {
        scope: 'account',
        limit: 5,
        key: 'event.data.accessToken',
      },
    ],
  },
  { event: 'site/delete' },
  async ({ event }) => {
    const { siteId } = event.data;
    await deleteProject(siteId);
    await deleteSiteCollection(siteId);
  },
);

export const cleanupExpiredSites = inngest.createFunction(
  {
    id: 'cleanup-expired-sites',
  },
  { cron: '0 3 * * *' }, // Run daily at 3 AM UTC
  async ({ step }) => {
    const expiredSites = await step.run('find-expired-sites', async () => {
      return prisma.site.findMany({
        where: {
          isTemporary: true,
          expiresAt: {
            lte: new Date(),
          },
        },
        select: {
          id: true,
          projectName: true,
        },
      });
    });

    if (expiredSites.length === 0) {
      return { deleted: 0 };
    }

    const results = await Promise.all(
      expiredSites.map((site) =>
        step.run(`delete-expired-site-${site.id}`, async () => {
          try {
            // Delete from database (cascades to blobs)
            await prisma.site.delete({
              where: { id: site.id },
            });

            // Clean up S3 and Typesense
            await deleteProject(site.id);
            await deleteSiteCollection(site.id);

            return { siteId: site.id, status: 'deleted' };
          } catch (error: any) {
            console.error(
              `Failed to delete expired site ${site.id}:`,
              error.message,
            );
            return { siteId: site.id, status: 'error', error: error.message };
          }
        }),
      ),
    );

    return {
      deleted: results.filter((r) => r.status === 'deleted').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    };
  },
);
