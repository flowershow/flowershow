import { env } from '@/env.mjs';

interface SyncParams {
  siteId: string;
  ghRepository: string;
  ghBranch: string;
  rootDir?: string | null;
  forceSync?: boolean;
  gitCommitSha?: string | null;
  gitCommitMessage?: string | null;
  githubInstallationId?: string | null; // This is the GitHub App installation ID, not the db one
}

export async function triggerGitHubSyncWorkflow(
  params: SyncParams,
): Promise<void> {
  const {
    siteId,
    ghRepository,
    ghBranch,
    rootDir,
    forceSync = false,
    gitCommitSha = null,
    gitCommitMessage = null,
    githubInstallationId = null,
  } = params;

  const response = await fetch(`${env.CF_WORKER_URL}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CF_WORKER_SECRET}`,
    },
    body: JSON.stringify({
      siteId,
      ghRepository,
      ghBranch,
      rootDir: rootDir ?? null,
      githubInstallationId,
      forceSync,
      gitCommitSha,
      gitCommitMessage,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to trigger sync for site ${siteId}: ${response.status} ${response.statusText}`,
    );
  }
}

export async function startPublishFinalizerWorkflow(
  publishId: string,
  siteId: string,
): Promise<void> {
  const response = await fetch(`${env.CF_WORKER_URL}/start-finalizer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CF_WORKER_SECRET}`,
    },
    body: JSON.stringify({ publishId, siteId }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to start lifecycle workflow for publish ${publishId}: ${response.status} ${response.statusText}`,
    );
  }
}

// TODO do we really want to terminate them ?
export async function terminatePublishFinalizerWorkflows(
  publishIds: string[],
): Promise<void> {
  if (publishIds.length === 0) return;
  const response = await fetch(`${env.CF_WORKER_URL}/terminate-finalizer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CF_WORKER_SECRET}`,
    },
    body: JSON.stringify({ publishIds }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to terminate publish finalizer workflows: ${response.status} ${response.statusText}`,
    );
  }
}
