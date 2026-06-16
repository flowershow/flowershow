import { deleteProject } from '@/lib/content-store';
import { deleteSiteCollection } from '@/lib/typesense';
import prisma from '@/server/db';
import { inngest } from './client';

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
