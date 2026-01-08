import * as Sentry from '@sentry/nextjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { inngest } from '@/inngest/client';
import {
  clearInstallationTokenCache,
  getInstallationToken,
} from '@/lib/github';
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
      // Installation was deleted
      console.log(`Installation deleted: ${installation.id}`);

      // Clear token cache
      clearInstallationTokenCache(installation.id.toString());

      // Find and mark the installation as deleted
      const existingInstallation = await prisma.gitHubInstallation.findUnique({
        where: { installationId },
      });

      if (existingInstallation) {
        // Delete the installation (cascade will handle repositories and sites)
        await prisma.gitHubInstallation.delete({
          where: { installationId },
        });

        // Note: Sites using this installation will need to be updated
        // You may want to add notification logic here
      }
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

  const installationId = BigInt(installation.id);

  // Find the installation in our database
  const dbInstallation = await prisma.gitHubInstallation.findUnique({
    where: { installationId },
  });

  if (!dbInstallation) {
    console.log(`Installation not found in database: ${installation.id}`);
    return;
  }

  switch (action) {
    case 'added':
      // Repositories were added to the installation
      if (repositories_added && repositories_added.length > 0) {
        console.log(
          `${repositories_added.length} repositories added to installation ${installation.id}`,
        );

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

    case 'removed':
      // Repositories were removed from the installation
      if (repositories_removed && repositories_removed.length > 0) {
        console.log(
          `${repositories_removed.length} repositories removed from installation ${installation.id}`,
        );

        const repoIds = repositories_removed.map((repo) => BigInt(repo.id));

        await prisma.gitHubInstallationRepository.deleteMany({
          where: {
            installationId: dbInstallation.id,
            repositoryId: { in: repoIds },
          },
        });

        // Note: Check if any sites use the removed repositories
        // You may want to add notification or update logic here
      }
      break;

    default:
      console.log(`Unhandled installation_repositories action: ${action}`);
  }

  // Update installation timestamp
  await prisma.gitHubInstallation.update({
    where: { id: dbInstallation.id },
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
      const { ref, repository } = data;

      if (!repository || !ref) {
        console.error('Push event missing repository or ref data');
        return;
      }

      // Extract branch name from ref (refs/heads/main -> main)
      const branch = ref.replace('refs/heads/', '');

      span.setAttribute('repository', repository.full_name);
      span.setAttribute('branch', branch);

      console.log(
        `Push event received for ${repository.full_name} on branch ${branch}`,
      );

      // Find all sites using this repository and branch with GitHub App installation
      const sites = await prisma.site.findMany({
        where: {
          ghRepository: repository.full_name,
          ghBranch: branch,
          installationId: { not: null },
          autoSync: true,
        },
        select: {
          id: true,
          ghRepository: true,
          ghBranch: true,
          rootDir: true,
          installationId: true,
        },
      });

      span.setAttribute('sites_found', sites.length);

      if (sites.length === 0) {
        console.log(
          `No sites found for ${repository.full_name}:${branch} with autoSync enabled`,
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
            ghRepository: site.ghRepository,
            ghBranch: site.ghBranch,
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
