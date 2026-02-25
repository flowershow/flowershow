import {
  DeviceTokenRequestSchema,
  type DeviceTokenResponse,
} from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { generateCliToken, hashToken } from '@/lib/cli-auth';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';

/**
 * POST /api/cli/device/token
 *
 * Exchanges an authorized device code for an access token.
 * The CLI polls this endpoint until the user authorizes the device code.
 *
 * OAuth 2.0 Device Authorization Grant - Step 4:
 * 1. CLI calls /api/cli/device/authorize to get device_code and user_code
 * 2. User visits verification URL and enters user_code
 * 3. Web UI calls /api/cli/authorize to authorize the device_code
 * 4. CLI polls THIS endpoint and receives access_token  <--
 *
 * No authentication required (uses device_code as proof).
 *
 * Request body: {
 *   device_code: string,
 *   grant_type: "urn:ietf:params:oauth:grant-type:device_code"
 * }
 *
 * Response (pending): { error: "authorization_pending" }
 * Response (success): {
 *   access_token: string,  // Bearer token (fs_cli_xxx)
 *   token_type: "Bearer",
 *   expires_in: null       // CLI tokens don't expire by default
 * }
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;
  try {
    const parsedBody = DeviceTokenRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'device_code is required',
        },
        { status: 400 },
      );
    }

    const { device_code, grant_type } = parsedBody.data;

    // Validate grant_type
    if (grant_type !== 'urn:ietf:params:oauth:grant-type:device_code') {
      return NextResponse.json(
        { error: 'unsupported_grant_type' },
        { status: 400 },
      );
    }

    // Look up device code
    const deviceCodeRecord = await prisma.deviceCode.findUnique({
      where: { deviceCode: device_code },
      include: { user: true },
    });

    if (!deviceCodeRecord) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid device code' },
        { status: 400 },
      );
    }

    // Check if expired
    if (deviceCodeRecord.expiresAt < new Date()) {
      // Clean up expired code
      await prisma.deviceCode.delete({
        where: { id: deviceCodeRecord.id },
      });

      return NextResponse.json(
        {
          error: 'expired_token',
          error_description: 'The device code has expired',
        },
        { status: 400 },
      );
    }

    // Check if authorized
    if (!deviceCodeRecord.authorized || !deviceCodeRecord.userId) {
      return NextResponse.json(
        { error: 'authorization_pending' },
        { status: 400 },
      );
    }
    userId = deviceCodeRecord.userId;

    // Generate CLI token
    const cliToken = generateCliToken();
    const hashedToken = hashToken(cliToken);

    // Store token in database
    await prisma.accessToken.create({
      data: {
        token: hashedToken,
        userId: deviceCodeRecord.userId,
        name: 'CLI Token',
        type: 'CLI',
      },
    });

    // Delete the device code (one-time use)
    await prisma.deviceCode.delete({
      where: { id: deviceCodeRecord.id },
    });

    const posthog = PostHogClient();
    posthog.capture({
      distinctId: userId,
      event: 'token_created',
      properties: { token_type: 'CLI' },
    });
    await posthog.shutdown();

    const response: DeviceTokenResponse = {
      access_token: cliToken,
      token_type: 'Bearer',
      expires_in: null, // No expiration by default
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in device token:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, userId ?? 'system', {
      route: 'POST /api/cli/device/token',
    });
    await posthog.shutdown();
    return NextResponse.json(
      {
        error: 'internal_error',
        error_description: 'Failed to process token request',
      },
      { status: 500 },
    );
  }
}
