import type { User } from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getClientInfo, validateAccessToken } from '@/lib/cli-auth';
import PostHogClient from '@/lib/server-posthog';
import { authOptions } from '@/server/auth';
import prisma from '@/server/db';

/**
 * GET /api/user
 * Get current authenticated user details
 * Supports both token-based auth (CLI, PAT, integrations) and session-based auth (web)
 */
export async function GET(request: NextRequest) {
  let userId: string | null = null;
  try {
    // First try token-based auth (CLI, PAT, integrations)
    const tokenAuth = await validateAccessToken(request);
    if (tokenAuth?.userId) {
      userId = tokenAuth.userId;
    } else {
      // Fall back to session-based auth (web users)
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 },
      );
    }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'not_found', error_description: 'User not found' },
        { status: 404 },
      );
    }

    const posthog = PostHogClient();
    const { client_type, client_version } = getClientInfo(request);
    posthog.capture({
      distinctId: userId,
      event: 'user_fetched',
      properties: {
        client_type,
        client_version,
      },
    });
    await posthog.shutdown();

    return NextResponse.json(user satisfies User);
  } catch (error) {
    console.error('Error fetching user:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, userId ?? 'system', {
      route: 'GET /api/user',
    });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', error_description: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}
