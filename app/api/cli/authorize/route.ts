import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { user_code } = body;

    if (!user_code) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'user_code is required',
        },
        { status: 400 },
      );
    }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in CLI authorize:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        error_description: 'Failed to authorize device',
      },
      { status: 500 },
    );
  }
}
