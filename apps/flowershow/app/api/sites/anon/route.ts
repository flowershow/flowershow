import { type NextRequest, NextResponse } from 'next/server';
import { hashIp } from '@/lib/anon-rate-limit';
import { createAnonSite } from '@/lib/anon-site';
import { getClientIp } from '@/lib/rate-limit';
import PostHogClient from '@/lib/server-posthog';

/**
 * POST /api/sites/anon
 * Create an empty temporary site for agent/CLI publishing without an account.
 * Files are then uploaded via POST /api/sites/id/:siteId/sync with
 * `Authorization: Bearer <claimToken>`. The site expires in 7 days unless claimed.
 */
export async function POST(request: NextRequest) {
  const posthog = PostHogClient();
  try {
    const result = await createAnonSite({
      bucket: hashIp(getClientIp(request.headers)),
      rateLimitedMessage:
        'Too many anonymous sites from this network. Try again later, or run `fl login`.',
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: result.status },
      );
    }

    posthog.capture({
      distinctId: result.site.siteId,
      event: 'anon_site_created',
      properties: {
        site_id: result.site.siteId,
        source: request.headers.get('x-flowershow-cli-version') ? 'cli' : 'api',
      },
    });
    await posthog.shutdown();
    return NextResponse.json(result.site);
  } catch (error) {
    console.error('Anon site create error:', error);
    posthog.captureException(error, 'system', {
      route: 'POST /api/sites/anon',
    });
    await posthog.shutdown();
    return NextResponse.json(
      {
        error: 'internal',
        message: 'Failed to create site. Please try again.',
      },
      { status: 500 },
    );
  }
}
