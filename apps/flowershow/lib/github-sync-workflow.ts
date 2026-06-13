const WORKFLOW_NAME = 'github-sync-workflow';

export interface GithubSyncWorkflowParams {
  publishId: string;
  siteId: string;
  installationDbId: string;
  ghRepository: string;
  ghBranch: string;
  rootDir?: string;
  gitCommitSha?: string;
  gitCommitMessage?: string;
}

export async function startGithubSyncWorkflow(
  params: GithubSyncWorkflowParams,
): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return;

  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workflows/${WORKFLOW_NAME}/instances`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: params.publishId, params }),
    },
  );
}
