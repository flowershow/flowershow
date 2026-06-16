import { env } from '@/env.mjs';
import { getInstallationToken } from '@/lib/github';

interface SyncParams {
  siteId: string;
  ghRepository: string;
  ghBranch: string;
  rootDir?: string | null;
  accessToken?: string;
  installationId?: string;
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
    accessToken,
    installationId,
    forceSync = false,
    gitCommitSha = null,
    gitCommitMessage = null,
  } = params;

  const resolvedToken = installationId
    ? await getInstallationToken(installationId)
    : accessToken;

  if (!resolvedToken) {
    throw new Error('Either accessToken or installationId must be provided');
  }

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
      accessToken: resolvedToken,
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
