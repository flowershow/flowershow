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
