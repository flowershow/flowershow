import * as Sentry from '@sentry/nextjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { inngest } from '@/inngest/client';
import { clearInstallationTokenCache } from '@/lib/github';
import prisma from '@/server/db';

interface WebhookPayload {
  action: string;
  installation?: {
    id: number;
    account: {
      id: number;
      login: string;
      type: 'User' | 'Organization';
    };
    suspended_at: string | null;
    suspended_by: string | null;
  };
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
  repositories_added?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
  repositories_removed?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
  // Push event fields
  ref?: string;
  repository?: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  };
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  // Use constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

/**
 * Handle GitHub App webhook events
 * POST /api/webhooks/github-app
 */
export async function POST(request: Request) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/webhooks/github-app',
    },
    async (span) => {
      try {
        const signature = request.headers.get('x-hub-signature-256');
        const eventType = request.headers.get('x-github-event');

        if (!signature) {
          return NextResponse.json(
            { error: 'Missing signature' },
            { status: 401 },
          );
        }

        const payload = await request.text();

        // Verify webhook signature
        if (
          !verifyWebhookSignature(
            payload,
            signature,
            env.GITHUB_APP_WEBHOOK_SECRET,
          )
        ) {
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 },
          );
        }

        const data = JSON.parse(payload) as WebhookPayload;

        span.setAttribute('event_type', eventType || 'unknown');
        span.setAttribute('installation_id', data.installation?.id);
        span.setAttribute('action', data.action);

        switch (eventType) {
          case 'installation':
            await handleInstallationEvent(data);
            break;

          case 'installation_repositories':
            await handleInstallationRepositoriesEvent(data);
            break;

          case 'push':
            await handlePushEvent(data);
            break;

          default:
            console.log(`Unhandled webhook event: ${eventType}`);
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error processing GitHub App webhook:', error);
        return NextResponse.json(
          { error: 'Webhook processing failed' },
          { status: 500 },
        );
      }
    },
  );
}

/**
 * Handle installation events (created, deleted, suspend, unsuspend)
 */
async function handleInstallationEvent(data: WebhookPayload) {
  const { action, installation } = data;

  if (!installation) {
    console.error('Installation event missing installation data');
    return;
  }

  const installationId = BigInt(installation.id);

  switch (action) {
    case 'created':
      // Installation is created - typically handled by callback, but handle here too
      console.log(`Installation created: ${installation.id}`);
      break;

    case 'deleted':
      // Installation was deleted - remove all user links to this installation
      console.log(`Installation deleted: ${installation.id}`);

      // Clear token cache
      clearInstallationTokenCache(installation.id.toString());

      // Delete all user links to this installation (cascade will handle repositories and sites)
      const deletedCount = await prisma.gitHubInstallation.deleteMany({
        where: { installationId },
      });

      console.log(
        `Deleted ${deletedCount.count} user link(s) for installation ${installation.id}`,
      );

      // Note: Sites using this installation will need to be updated
      // You may want to add notification logic here
      break;

    case 'suspend':
      // Installation was suspended
      console.log(`Installation suspended: ${installation.id}`);

      await prisma.gitHubInstallation.updateMany({
        where: { installationId },
        data: {
          suspendedAt: installation.suspended_at
            ? new Date(installation.suspended_at)
            : new Date(),
          suspendedBy: installation.suspended_by,
        },
      });

      // Clear token cache
      clearInstallationTokenCache(installation.id.toString());
      break;

    case 'unsuspend':
      // Installation was unsuspended
      console.log(`Installation unsuspended: ${installation.id}`);

      await prisma.gitHubInstallation.updateMany({
        where: { installationId },
        data: {
          suspendedAt: null,
          suspendedBy: null,
        },
      });
      break;

    default:
      console.log(`Unhandled installation action: ${action}`);
  }
}

/**
 * Handle installation_repositories events (added, removed)
 */
async function handleInstallationRepositoriesEvent(data: WebhookPayload) {
  const { action, installation, repositories_added, repositories_removed } =
    data;

  if (!installation) {
    console.error('Installation repositories event missing installation data');
    return;
  }

  const ghInstallationId = BigInt(installation.id);

  switch (action) {
    case 'added': {
      // Repositories were added to the installation
      if (!repositories_added || repositories_added.length === 0) break;

      // Find all user links to this installation by GitHub's installation ID
      const dbInstallations = await prisma.gitHubInstallation.findMany({
        where: { installationId: ghInstallationId },
      });

      if (dbInstallations.length === 0) {
        console.log(`Installation not found in database: ${installation.id}`);
        return;
      }

      console.log(
        `${repositories_added.length} repositories added to installation ${installation.id} (${dbInstallations.length} user link(s))`,
      );

      // Add repositories for each user link
      for (const dbInstallation of dbInstallations) {
        await prisma.gitHubInstallationRepository.createMany({
          data: repositories_added.map((repo) => ({
            installationId: dbInstallation.id,
            repositoryId: BigInt(repo.id),
            repositoryName: repo.name,
            repositoryFullName: repo.full_name,
            isPrivate: repo.private,
          })),
          skipDuplicates: true,
        });
      }
      break;
    }

    case 'removed': {
      // Repositories were removed from the installation
      if (!repositories_removed || repositories_removed.length === 0) break;

      const repoFullNames = repositories_removed.map((repo) => repo.full_name);
      const repoIds = repositories_removed.map((repo) => BigInt(repo.id));

      // Find all user links, eagerly loading affected sites
      const dbInstallations = await prisma.gitHubInstallation.findMany({
        where: { installationId: ghInstallationId },
        include: {
          sites: {
            where: { ghRepository: { in: repoFullNames } },
            select: {
              id: true,
              projectName: true,
              ghRepository: true,
              userId: true,
            },
          },
        },
      });

      if (dbInstallations.length === 0) {
        console.log(`Installation not found in database: ${installation.id}`);
        return;
      }

      console.log(
        `${repositories_removed.length} repositories removed from installation ${installation.id} (${dbInstallations.length} user link(s))`,
      );

      // Process each user link — sites were already loaded via include
      for (const dbInstallation of dbInstallations) {
        // Delete repository access records for this user link
        await prisma.gitHubInstallationRepository.deleteMany({
          where: {
            installationId: dbInstallation.id,
            repositoryId: { in: repoIds },
          },
        });

        // Clear installationId and disable autoSync for affected sites
        if (dbInstallation.sites.length > 0) {
          console.log(
            `Clearing installation access for ${dbInstallation.sites.length} affected site(s) for user ${dbInstallation.userId}`,
          );

          await prisma.site.updateMany({
            where: {
              id: { in: dbInstallation.sites.map((s) => s.id) },
            },
            data: {
              installationId: null,
              autoSync: false,
            },
          });
        }
      }
      break;
    }

    default:
      console.log(`Unhandled installation_repositories action: ${action}`);
  }

  // Update installation timestamps for all user links
  await prisma.gitHubInstallation.updateMany({
    where: { installationId: ghInstallationId },
    data: { updatedAt: new Date() },
  });
}

/**
 * Handle push events for repositories in GitHub App installations
 * This eliminates the need for per-repository webhooks
 */
async function handlePushEvent(data: WebhookPayload) {
  return Sentry.startSpan(
    {
      op: 'webhook.push',
      name: 'Handle GitHub App Push Event',
    },
    async (span) => {
      const { ref, repository, installation } = data;

      if (!repository || !ref || !installation) {
        console.error(
          'Push event missing repository, ref, or installation data',
        );
        return;
      }

      // Extract branch name from ref (refs/heads/main -> main)
      const branch = ref.replace('refs/heads/', '');

      span.setAttribute('repository', repository.full_name);
      span.setAttribute('branch', branch);
      span.setAttribute('installation_id', installation.id);

      console.log(
        `Push event received for ${repository.full_name} on branch ${branch} (installation ${installation.id})`,
      );

      // Look up installations by GitHub's installation ID, including linked sites
      const dbInstallations = await prisma.gitHubInstallation.findMany({
        where: { installationId: BigInt(installation.id) },
        include: {
          sites: {
            where: {
              ghRepository: repository.full_name,
              ghBranch: branch,
              autoSync: true,
            },
            select: {
              id: true,
              ghRepository: true,
              ghBranch: true,
              rootDir: true,
              installationId: true,
            },
          },
        },
      });

      span.setAttribute('installations_found', dbInstallations.length);

      if (dbInstallations.length === 0) {
        console.log(
          `No installations found in database for GitHub installation ${installation.id}`,
        );
        return;
      }

      // Collect all matching sites across all user links for this installation
      const sites = dbInstallations.flatMap((inst) => inst.sites);

      span.setAttribute('sites_found', sites.length);

      if (sites.length === 0) {
        console.log(
          `No sites found for ${repository.full_name}:${branch} (installation ${installation.id})`,
        );
        return;
      }

      console.log(
        `Triggering sync for ${sites.length} site(s) using ${repository.full_name}:${branch}`,
      );

      // Trigger sync for each matching site
      const syncPromises = sites.map((site) =>
        inngest.send({
          name: 'site/sync',
          data: {
            siteId: site.id,
            ghRepository: site.ghRepository!,
            ghBranch: site.ghBranch!,
            rootDir: site.rootDir,
            installationId: site.installationId!,
          },
        }),
      );

      await Promise.all(syncPromises);

      console.log(`Successfully triggered sync for ${sites.length} site(s)`);
    },
  );
}
