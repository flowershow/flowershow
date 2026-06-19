import { env } from '@/env.mjs';

export async function startPublishLifecycle(
  publishId: string,
  siteId: string,
): Promise<void> {
  const response = await fetch(`${env.CF_SYNC_WORKER_URL}/start-lifecycle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CF_SYNC_WORKER_SECRET}`,
    },
    body: JSON.stringify({ publishId, siteId }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to start lifecycle workflow for publish ${publishId}: ${response.status} ${response.statusText}`,
    );
  }
}

export async function terminatePublishLifecycle(
  publishIds: string[],
): Promise<void> {
  if (publishIds.length === 0) return;
  const response = await fetch(
    `${env.CF_SYNC_WORKER_URL}/terminate-lifecycle`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CF_SYNC_WORKER_SECRET}`,
      },
      body: JSON.stringify({ publishIds }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to terminate lifecycle workflows: ${response.status} ${response.statusText}`,
    );
  }
}
