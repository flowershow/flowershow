import type { DeviceAuthorizeResponse } from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { generateDeviceCode, generateUserCode } from '@/lib/cli-auth';
import prisma from '@/server/db';

/**
 * POST /api/cli/device/authorize
 *
 * Initiates the device authorization flow for CLI authentication.
 * Generates a device code and user code pair for the OAuth 2.0 Device Authorization Grant.
 *
 * OAuth 2.0 Device Authorization Grant - Step 1:
 * 1. CLI calls THIS endpoint to get device_code and user_code  <--
 * 2. User visits verification URL and enters user_code
 * 3. Web UI calls /api/cli/authorize to authorize the device_code
 * 4. CLI polls /api/cli/device/token and receives access_token
 *
 * No authentication required (this initiates the auth flow).
 *
 * Response: {
 *   device_code: string,      // Secret code for CLI to poll with
 *   user_code: string,        // Human-readable code (e.g., "XXXX-XXXX") for user to enter
 *   verification_uri: string, // URL where user enters the code
 *   verification_uri_complete: string, // URL with code pre-filled
 *   expires_in: number,       // Seconds until codes expire
 *   interval: number          // Minimum polling interval in seconds
 * }
 */
export async function POST(_request: NextRequest) {
  try {
    // Generate codes
    const deviceCode = generateDeviceCode();
    const userCode = generateUserCode();

    // Set expiration (24 hour from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store in database
    await prisma.deviceCode.create({
      data: {
        deviceCode,
        userCode,
        expiresAt,
        interval: 5,
      },
    });

    // Build verification URIs
    const baseUrl = `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`;
    const verificationUri = `${baseUrl}/cli/verify`;
    const verificationUriComplete = `${baseUrl}/cli/verify?code=${userCode}`;

    const response: DeviceAuthorizeResponse = {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: verificationUri,
      verification_uri_complete: verificationUriComplete,
      expires_in: 900, // 15 minutes in seconds
      interval: 5,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in device authorize:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        error_description: 'Failed to generate device code',
      },
      { status: 500 },
    );
  }
}
