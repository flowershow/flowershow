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
