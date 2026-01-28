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
    const { token_id } = body;

    if (!token_id) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'token_id is required' },
        { status: 400 },
      );
    }

    // Find and delete the token (only if it belongs to the user)
    const token = await prisma.accessToken.findFirst({
      where: {
        id: token_id,
        userId: session.user.id,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking token:', error);
    return NextResponse.json(
      { error: 'internal_error', error_description: 'Failed to revoke token' },
      { status: 500 },
    );
  }
}
