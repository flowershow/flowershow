import { NextRequest, NextResponse } from 'next/server';
import { validateCliToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

export async function GET(request: NextRequest) {
  try {
    // Validate CLI token from Authorization header
    const auth = await validateCliToken(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 },
      );
    }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'internal_error', error_description: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}
