import { env } from '@/env.mjs';
import { getGithubInstallationId } from '@/lib/github';

interface SyncParams {
  siteId: string;
  ghRepository: string;
  ghBranch: string;
  rootDir?: string | null;
  installationId: string;
  forceSync?: boolean;
  gitCommitSha?: string | null;
  gitCommitMessage?: string | null;
}

export async function triggerSiteSync(params: SyncParams): Promise<void> {
  if (!env.CF_SYNC_WORKER_URL || !env.CF_SYNC_WORKER_SECRET) {
    throw new Error(
      'CF_SYNC_WORKER_URL and CF_SYNC_WORKER_SECRET must be configured',
    );
  }

  const {
    siteId,
    ghRepository,
    ghBranch,
    rootDir,
    installationId,
    forceSync = false,
    gitCommitSha = null,
    gitCommitMessage = null,
  } = params;

  const githubInstallationId = await getGithubInstallationId(installationId);

  const response = await fetch(`${env.CF_SYNC_WORKER_URL}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CF_SYNC_WORKER_SECRET}`,
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
