import { logs } from '@opentelemetry/api-logs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Register the OTel logger provider for PostHog Logs
    const { loggerProvider } = await import('./lib/otel-logger');
    logs.setGlobalLoggerProvider(loggerProvider);
  }
}

export async function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
    revalidateReason: 'on-demand' | 'stale' | undefined;
  },
) {
  // Ignore Next.js "expected" navigation errors
  if (
    error.digest?.startsWith('NEXT_NOT_FOUND') ||
    error.digest?.startsWith('NEXT_REDIRECT')
  ) {
    return;
  }

  const { default: PostHogClient } = await import('./lib/server-posthog');
  const posthog = PostHogClient();

  posthog.captureException(error, 'server-request-error', {
    request_path: request.path,
    request_method: request.method,
    router_kind: context.routerKind,
    route_path: context.routePath,
    route_type: context.routeType,
    revalidate_reason: context.revalidateReason,
  });

  await posthog.shutdown();
}
