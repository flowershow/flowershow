import {
  RevokeTokenRequestSchema,
  type SuccessResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import PostHogClient from '@/lib/server-posthog';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'unauthorized', error_description: 'Not authenticated' },
      { status: 401 },
    );
  }
  const userId = session.user.id;
  try {
    const parsedBody = RevokeTokenRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'token_id is required' },
        { status: 400 },
      );
    }

    const { token_id } = parsedBody.data;

    // Find and delete the token (only if it belongs to the user)
    const token = await prisma.accessToken.findFirst({
      where: {
        id: token_id,
        userId: userId,
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'not_found', error_description: 'Token not found' },
        { status: 404 },
      );
    }

    await prisma.accessToken.delete({
      where: { id: token_id },
    });

    const posthog = PostHogClient();
    posthog.capture({
      distinctId: userId,
      event: 'token_revoked',
      properties: { token_id },
    });
    await posthog.shutdown();

    return NextResponse.json({ success: true } satisfies SuccessResponse);
  } catch (error) {
    console.error('Error revoking token:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, userId, {
      route: 'POST /api/tokens/revoke',
    });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', error_description: 'Failed to revoke token' },
      { status: 500 },
    );
  }
}
