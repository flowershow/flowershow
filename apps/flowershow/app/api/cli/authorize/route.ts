import {
  AuthorizeDeviceRequestSchema,
  type SuccessResponse,
} from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import PostHogClient from '@/lib/server-posthog';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';

/**
 * POST /api/cli/authorize
 *
 * Authorizes a pending device code during the CLI login flow.
 * This endpoint is called from the web UI after a user enters their verification code.
 *
 * OAuth 2.0 Device Authorization Grant - Step 3:
 * 1. CLI calls /api/cli/device/authorize to get device_code and user_code
 * 2. User visits verification URL and enters user_code
 * 3. Web UI calls THIS endpoint to authorize the device_code  <--
 * 4. CLI polls /api/cli/device/token and receives access_token
 *
 * Requires: Authenticated web session (cookie-based)
 * Request body: { user_code: string }
 * Response: { success: true } or error
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'unauthorized', error_description: 'Not authenticated' },
      { status: 401 },
    );
  }
  const userId = session.user.id;
  try {
    const parsedBody = AuthorizeDeviceRequestSchema.safeParse(
      await request.json(),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'user_code is required',
        },
        { status: 400 },
      );
    }

    const { user_code } = parsedBody.data;

    // Find the device code
    const deviceCode = await prisma.deviceCode.findUnique({
      where: { userCode: user_code },
    });

    if (!deviceCode) {
      return NextResponse.json(
        {
          error: 'invalid_code',
          error_description: 'Invalid or expired verification code',
        },
        { status: 400 },
      );
    }

    // Check if expired
    if (deviceCode.expiresAt < new Date()) {
      // Clean up expired code
      await prisma.deviceCode.delete({
        where: { id: deviceCode.id },
      });

      return NextResponse.json(
        {
          error: 'expired_code',
          error_description: 'Verification code has expired',
        },
        { status: 400 },
      );
    }

    // Check if already authorized
    if (deviceCode.authorized) {
      return NextResponse.json(
        {
          error: 'already_authorized',
          error_description: 'This code has already been used',
        },
        { status: 400 },
      );
    }

    // Authorize the device code
    await prisma.deviceCode.update({
      where: { id: deviceCode.id },
      data: {
        authorized: true,
        userId: session.user.id,
        authorizedAt: new Date(),
      },
    });

    const posthog = PostHogClient();
    posthog.capture({
      distinctId: userId,
      event: 'device_authorized',
    });
    await posthog.shutdown();

    return NextResponse.json({ success: true } satisfies SuccessResponse);
  } catch (error) {
    console.error('Error in CLI authorize:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, userId, {
      route: 'POST /api/cli/authorize',
    });
    await posthog.shutdown();
    return NextResponse.json(
      {
        error: 'internal_error',
        error_description: 'Failed to authorize device',
      },
      { status: 500 },
    );
  }
}
