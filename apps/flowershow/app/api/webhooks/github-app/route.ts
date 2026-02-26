import type { SuccessResponse } from '@flowershow/api-contract';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { inngest } from '@/inngest/client';
import { clearInstallationTokenCache } from '@/lib/github';
import { log, SeverityNumber } from '@/lib/otel-logger';
import PostHogClient from '@/lib/server-posthog';
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
    owner?: {
      login: string;
    };
  };
  // Repository renamed event fields
  changes?: {
    repository?: {
      name?: { from: string };
    };
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
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const eventType = request.headers.get('x-github-event');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const payload = await request.text();

    // Verify webhook signature
    if (
      !verifyWebhookSignature(payload, signature, env.GITHUB_APP_WEBHOOK_SECRET)
    ) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(payload) as WebhookPayload;

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

      case 'repository':
        await handleRepositoryEvent(data);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    log('POST /api/webhooks/github-app', SeverityNumber.INFO, {
      event_type: eventType || 'unknown',
      installation_id: data.installation?.id,
      action: data.action,
    });

    return NextResponse.json({ success: true } satisfies SuccessResponse);
  } catch (error) {
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', {
      route: 'POST /api/webhooks/github-app',
    });
    await posthog.shutdown();
    console.error('Error processing GitHub App webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
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

      const repoIds = repositories_removed.map((repo) => BigInt(repo.id));

      const dbInstallations = await prisma.gitHubInstallation.findMany({
        where: { installationId: ghInstallationId },
      });

      if (dbInstallations.length === 0) {
        console.log(`Installation not found in database: ${installation.id}`);
        return;
      }

      console.log(
        `${repositories_removed.length} repositories removed from installation ${installation.id} (${dbInstallations.length} user link(s))`,
      );

      for (const dbInstallation of dbInstallations) {
        // Find affected sites BEFORE deleting repos (FK cascade will null the link)
        const affectedSites = await prisma.site.findMany({
          where: {
            installationRepository: {
              installationId: dbInstallation.id,
              repositoryId: { in: repoIds },
            },
          },
          select: {
            id: true,
            projectName: true,
            ghRepository: true,
            userId: true,
          },
        });

        // Delete repository access records (cascades SET NULL on Site.installationRepositoryId)
        await prisma.gitHubInstallationRepository.deleteMany({
          where: {
            installationId: dbInstallation.id,
            repositoryId: { in: repoIds },
          },
        });

        // Disable autoSync for affected sites
        if (affectedSites.length > 0) {
          console.log(
            `Clearing installation access for ${affectedSites.length} affected site(s) for user ${dbInstallation.userId}`,
          );

          await prisma.site.updateMany({
            where: {
              id: { in: affectedSites.map((s) => s.id) },
            },
            data: { autoSync: false },
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
 * Handle repository events (renamed, transferred, etc.)
 */
async function handleRepositoryEvent(data: WebhookPayload) {
  const { action, repository, installation, changes } = data;

  if (!repository || !installation) {
    console.error('Repository event missing required data');
    return;
  }

  if (action !== 'renamed') {
    console.log(`Unhandled repository action: ${action}`);
    return;
  }

  const repositoryId = BigInt(repository.id);
  const newFullName = repository.full_name;
  const newName = repository.name;

  // Update the authoritative source — GitHubInstallationRepository.
  // Sites linked via installationRepositoryId FK automatically see the new name.
  const updatedRepos = await prisma.gitHubInstallationRepository.updateMany({
    where: { repositoryId },
    data: {
      repositoryFullName: newFullName,
      repositoryName: newName,
    },
  });

  // Fallback: update ghRepository on legacy sites that aren't linked via FK yet
  const oldName = changes?.repository?.name?.from;
  const oldFullName =
    oldName && repository.owner?.login
      ? `${repository.owner.login}/${oldName}`
      : null;

  let updatedLegacySites = { count: 0 };
  if (oldFullName) {
    updatedLegacySites = await prisma.site.updateMany({
      where: {
        installationRepositoryId: null,
        ghRepository: oldFullName,
      },
      data: { ghRepository: newFullName },
    });
  }

  log('Handle Repository Renamed Event', SeverityNumber.INFO, {
    source: 'github_app_repository',
    action: 'renamed',
    repository_id: repository.id,
    old_full_name: oldFullName ?? undefined,
    new_full_name: newFullName,
    installation_id: installation.id,
    repos_updated: updatedRepos.count,
    legacy_sites_updated: updatedLegacySites.count,
  });
}

/**
 * Handle push events for repositories in GitHub App installations
 * This eliminates the need for per-repository webhooks
 */
async function handlePushEvent(data: WebhookPayload) {
  const { ref, repository, installation } = data;
  const posthog = PostHogClient();

  try {
    if (!repository || !ref || !installation) {
      log('Handle GitHub App Push Event', SeverityNumber.WARN, {
        source: 'github_app_push',
        reason: 'missing_push_payload_fields',
      });
      return;
    }

    // Extract branch name from ref (refs/heads/main -> main)
    const branch = ref.replace('refs/heads/', '');
    const ghInstallationId = BigInt(installation.id);

    // Look up a DB installation record to get the CUID for inngest token resolution
    const dbInstallation = await prisma.gitHubInstallation.findFirst({
      where: { installationId: ghInstallationId },
      select: { id: true },
    });

    if (!dbInstallation) {
      log('Handle GitHub App Push Event', SeverityNumber.WARN, {
        source: 'github_app_push',
        reason: 'installation_not_found',
        repository: repository.full_name,
        branch,
        installation_id: installation.id,
      });
      return;
    }

    // Find matching sites by stable repository ID via installationRepository FK (preferred),
    // with fallback to ghRepository string for legacy/non-backfilled sites.
    const sites = await prisma.site.findMany({
      where: {
        ghBranch: branch,
        autoSync: true,
        OR: [
          {
            installationRepository: {
              repositoryId: BigInt(repository.id),
              installation: { installationId: ghInstallationId },
            },
          },
          {
            installationRepositoryId: null,
            ghRepository: repository.full_name,
          },
        ],
      },
      select: {
        id: true,
        ghRepository: true,
        ghBranch: true,
        rootDir: true,
        installationRepository: {
          select: { installationId: true },
        },
      },
    });

    if (sites.length === 0) {
      log('Handle GitHub App Push Event', SeverityNumber.INFO, {
        source: 'github_app_push',
        reason: 'no_matching_sites',
        repository: repository.full_name,
        branch,
        installation_id: installation.id,
      });
      return;
    }

    const syncResults = await Promise.allSettled(
      sites.map((site) =>
        inngest.send({
          name: 'site/sync',
          data: {
            siteId: site.id,
            // Prefer the webhook's current repo name (always up-to-date) over the
            // potentially-stale Site.ghRepository column.
            ghRepository: repository.full_name,
            ghBranch: site.ghBranch!,
            rootDir: site.rootDir,
            installationId:
              site.installationRepository?.installationId ?? dbInstallation.id,
          },
        }),
      ),
    );

    const failedSyncs = syncResults
      .map((result, index) => ({ result, site: sites[index] }))
      .filter(
        (
          item,
        ): item is {
          result: PromiseRejectedResult;
          site: (typeof sites)[number];
        } => item.result.status === 'rejected',
      );

    for (const failedSync of failedSyncs) {
      posthog.captureException(failedSync.result.reason, 'system', {
        route: 'POST /api/webhooks/github-app',
        source: 'github_app_push',
        operation: 'trigger_site_sync',
        siteId: failedSync.site.id,
        repository: repository.full_name,
        branch,
        installationId: installation.id,
      });
    }

    const triggeredSites = sites.length - failedSyncs.length;

    posthog.capture({
      distinctId: 'system',
      event: 'site_sync_triggered',
      properties: {
        source: 'github_app_push',
        repository: repository.full_name,
        branch,
        installationId: installation.id,
        sitesMatched: sites.length,
        sitesTriggered: triggeredSites,
        sitesFailed: failedSyncs.length,
      },
    });

    log('Handle GitHub App Push Event', SeverityNumber.INFO, {
      source: 'github_app_push',
      repository: repository.full_name,
      branch,
      installation_id: installation.id,
      sites_found: sites.length,
      sites_triggered: triggeredSites,
      sites_failed: failedSyncs.length,
    });
  } finally {
    await posthog.shutdown();
  }
}
