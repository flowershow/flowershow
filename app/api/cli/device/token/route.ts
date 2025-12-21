import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db';
import { generateCliToken, hashToken } from '@/lib/cli-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_code, grant_type } = body;

    // Validate grant_type
    if (grant_type !== 'urn:ietf:params:oauth:grant-type:device_code') {
      return NextResponse.json(
        { error: 'unsupported_grant_type' },
        { status: 400 },
      );
    }

    // Validate device_code is provided
    if (!device_code) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'device_code is required',
        },
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

    // Generate CLI token
    const cliToken = generateCliToken();
    const hashedToken = await hashToken(cliToken);

    // Store token in database
    await prisma.cliToken.create({
      data: {
        token: hashedToken,
        userId: deviceCodeRecord.userId,
        name: 'CLI Token',
      },
    });

    // Delete the device code (one-time use)
    await prisma.deviceCode.delete({
      where: { id: deviceCodeRecord.id },
    });

    return NextResponse.json({
      access_token: cliToken,
      token_type: 'Bearer',
      expires_in: null, // No expiration by default
    });
  } catch (error) {
    console.error('Error in device token:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        error_description: 'Failed to process token request',
      },
      { status: 500 },
    );
  }
}
