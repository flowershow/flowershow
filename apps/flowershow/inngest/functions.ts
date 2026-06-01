import { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { SiteConfig } from '@/components/types';
import { deleteBlobs } from '@/lib/blob-cleanup';
import { deleteProject, uploadFile } from '@/lib/content-store';
import {
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  type GitHubAPIFileContent,
  type GitHubAPIRepoTreeItem,
  getInstallationToken,
  githubJsonFetch,
} from '@/lib/github';
import { log, SeverityNumber } from '@/lib/otel-logger';
import { isPathVisible } from '@/lib/path-validator';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import {
  createSiteCollection,
  deleteSiteCollection,
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
      gitCommitSha,
      gitCommitMessage,
    } = event.data;

    const publish = await step.run('create-publish', async () => {
      return prisma.publish.create({
        data: {
          siteId,
          source: 'github_webhook',
          ...(gitCommitSha && { gitCommitSha }),
          ...(gitCommitMessage && { gitCommitMessage }),
        },
        select: { id: true },
      });
    });

    await step.run('cancel-superseded-publish-files', async () => {
      const previous = await prisma.publish.findMany({
        where: { siteId, id: { not: publish.id } },
        select: { id: true },
      });
      if (previous.length === 0) return;
      await prisma.publishFile.updateMany({
        where: {
          publishId: { in: previous.map((p) => p.id) },
          status: 'uploading',
        },
        data: { status: 'canceled' },
      });
    });

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
          url: `/repos/${ghRepository}/contents/config.json?ref=${encodeURIComponent(ghBranch)}`,
          accessToken: token,
          cacheOptions: {
            cache: 'no-store',
          },
        });
        return JSON.parse(
          Buffer.from(config.content, 'base64').toString('utf-8'),
        );
      } catch {
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
      return fetchGitHubRepoTree({
        ghRepository,
        ghBranch,
        accessToken,
        installationId,
      });
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
              ghTreeItem.type !== 'tree' &&
              ghTreeItem.path.startsWith(normalizedRootDir) &&
              isPathVisible(ghTreeItem.path, includes, excludes),
          )
          .map((ghTreeItem) => {
            const filePath = ghTreeItem.path.replace(normalizedRootDir, '');
            const changeType: 'added' | 'updated' = blobShaMap.has(filePath)
              ? 'updated'
              : 'added';
            return { ghTreeItem, filePath, changeType };
          })
          .filter(({ ghTreeItem, filePath }) => {
            return (
              forceSync ||
              !blobShaMap.has(filePath) ||
              blobShaMap.get(filePath) !== ghTreeItem.sha
            );
          });

        type FileToUpsert = {
          ghTreeItem: GitHubAPIRepoTreeItem;
          filePath: string;
          changeType: 'added' | 'updated';
        };

        const fileBatches: FileToUpsert[][] = [];
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          fileBatches.push(items.slice(i, i + BATCH_SIZE));
        }

        return fileBatches;
      },
    );

    await step.run('create-publish-files-for-upsert', async () => {
      const allItems = fileBatchesToUpsert.flat();
      if (allItems.length > 0) {
        await prisma.publishFile.createMany({
          data: allItems.map(({ filePath, changeType }) => ({
            publishId: publish.id,
            path: filePath,
            changeType,
            status: 'uploading' as const,
          })),
        });
      }
    });

    await Promise.all(
      fileBatchesToUpsert.map((batch, index) => {
        return step.run(`process-files-to-upsert-batch-${index}`, async () => {
          const processedFiles = await Promise.all(
            batch.map(async ({ ghTreeItem, filePath }) => {
              try {
                const extension = ghTreeItem.path.split('.').pop() || '';

                const urlPath = (() => {
                  if (['md', 'mdx', 'canvas'].includes(extension)) {
                    const _urlPath = resolveFilePathToUrlPath({
                      target: filePath,
                    });
                    return _urlPath === '/'
                      ? _urlPath
                      : _urlPath.replace(/^\//, '');
                  } else {
                    return null;
                  }
                })();

                // Create/update blob record BEFORE uploading to S3
                // This ensures the record exists when the S3 worker is triggered
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
                  },
                  update: {
                    appPath: urlPath,
                    size: ghTreeItem.size || 0,
                    sha: ghTreeItem.sha,
                  },
                });

                const gitHubFile = await fetchGitHubFileRaw({
                  ghRepository,
                  file_sha: ghTreeItem.sha,
                  accessToken,
                  installationId,
                });

                await uploadFile({
                  projectId: siteId,
                  path: filePath,
                  content: Buffer.from(await gitHubFile.arrayBuffer()),
                  extension,
                  publishId: publish.id,
                });

                return { filePath, status: 'SUCCESS', message: '' };
              } catch (error: any) {
                log('Sync file error', SeverityNumber.ERROR, {
                  siteId,
                  file_path: filePath,
                  error_message: error.message,
                  error_name: error.name,
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
                    size: 0,
                    sha: '',
                    metadata: Prisma.JsonNull,
                  },
                  update: {},
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
        const existingBlobs = await prisma.blob.findMany({
          where: { siteId },
          select: { path: true, id: true },
        });

        const visiblePaths = new Set(
          gitHubTree.tree
            .filter(
              (ghTreeItem) =>
                ghTreeItem.type !== 'tree' &&
                ghTreeItem.path.startsWith(normalizedRootDir) &&
                isPathVisible(ghTreeItem.path, includes, excludes),
            )
            .map((ghTreeItem) =>
              ghTreeItem.path.replace(normalizedRootDir, ''),
            ),
        );

        const filesToDelete = existingBlobs.filter(
          (blob) => !visiblePaths.has(blob.path),
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
          const deletedPaths = await deleteBlobs(siteId, batch);
          const deletedSet = new Set(deletedPaths);
          await prisma.publishFile.createMany({
            data: batch.map((f) => ({
              publishId: publish.id,
              path: f.path,
              changeType: 'deleted' as const,
              status: (deletedSet.has(f.path) ? 'success' : 'error') as
                | 'success'
                | 'error',
            })),
          });
          return deletedPaths;
        });
      }),
    );

    // NOTE: this won't fully work (e.g. for getBlob) as part of the metadata is being updated in the db later, by the Cloudflare worker
    // still works for most site related cached data
    await step.run('revalidate-tags', async () => {
      revalidateTag(`${site.id}`);
    });

    // If the sync produced no file changes, delete the empty Publish record so
    // it doesn't show as PENDING forever in getSyncStatus.
    await step.run('cleanup-empty-publish', async () => {
      const fileCount = await prisma.publishFile.count({
        where: { publishId: publish.id },
      });
      if (fileCount === 0) {
        await prisma.publish.delete({ where: { id: publish.id } });
      }
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

export const cleanupExpiredPublishFiles = inngest.createFunction(
  {
    id: 'cleanup-expired-publish-files',
  },
  { cron: '*/15 * * * *' }, // Every 15 minutes
  async ({ step }) => {
    const directUploadExpired = await step.run(
      'expire-stale-uploading-files',
      async () => {
        return prisma.publishFile.updateMany({
          where: {
            status: 'uploading',
            presignedUrlExpiresAt: { lt: new Date() },
          },
          data: {
            status: 'error',
            error: 'upload expired',
          },
        });
      },
    );

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const githubPathExpired = await step.run(
      'expire-stale-github-path-files',
      async () => {
        return prisma.publishFile.updateMany({
          where: {
            status: 'uploading',
            presignedUrlExpiresAt: null,
            publish: { startedAt: { lt: twoHoursAgo } },
          },
          data: {
            status: 'canceled',
          },
        });
      },
    );

    return {
      expired: directUploadExpired.count + githubPathExpired.count,
    };
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
