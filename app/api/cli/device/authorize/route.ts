import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { generateDeviceCode, generateUserCode } from '@/lib/cli-auth';
import prisma from '@/server/db';

export async function POST(request: NextRequest) {
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

    return NextResponse.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: verificationUri,
      verification_uri_complete: verificationUriComplete,
      expires_in: 900, // 15 minutes in seconds
      interval: 5,
    });
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
