export function resolveTargetToBlob(targetPath, blobs) {
  return (
    blobs.find(
      (b) =>
        b.permalink === targetPath ||
        b.app_path === targetPath ||
        b.path === targetPath ||
        b.path.endsWith(`/${targetPath}`) ||
        b.path.endsWith(`/${targetPath}.md`) ||
        b.path.endsWith(`/${targetPath}.mdx`),
    ) ?? null
  );
}

export function generateId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  return `c${timestamp}${random}`;
}

export async function captureError(env, properties) {
  if (!env.POSTHOG_KEY) return;
  try {
    const host = env.POSTHOG_HOST || 'https://eu.i.posthog.com';
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.POSTHOG_KEY,
        event: '$exception',
        distinct_id: 'system',
        properties,
      }),
    });
  } catch {
    // Never let PostHog errors affect the worker
  }
}
