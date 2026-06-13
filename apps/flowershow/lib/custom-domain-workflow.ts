const WORKFLOW_NAME = 'custom-domain-workflow';

export interface CustomDomainWorkflowParams {
  email: string;
  name: string | null;
  domain: string;
  siteId: string;
}

export async function startCustomDomainWorkflow(
  instanceId: string,
  params: CustomDomainWorkflowParams,
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
      body: JSON.stringify({ id: instanceId, params }),
    },
  );
}
