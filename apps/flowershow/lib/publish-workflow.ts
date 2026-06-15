const WORKFLOW_NAME = 'publish-workflow';

export async function startPublishWorkflow(
  publishId: string,
  siteId: string,
): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (accountId && apiToken) {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workflows/${WORKFLOW_NAME}/instances`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: publishId, params: { publishId, siteId } }),
      },
    );
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(
        `Failed to start publish workflow: HTTP ${resp.status}: ${text}`,
      );
    }
    return;
  }

  // Local dev fallback: call the worker directly via its binding-aware HTTP endpoint.
  // Requires WORKER_INTERNAL_URL (e.g. http://localhost:8787) and INTERNAL_API_SECRET in .env.local.
  const workerUrl = process.env.WORKER_INTERNAL_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (workerUrl && secret) {
    const resp = await fetch(`${workerUrl}/internal/workflows/publish/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publishId, siteId }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(
        `Failed to start publish workflow (dev): HTTP ${resp.status}: ${text}`,
      );
    }
  }
}
