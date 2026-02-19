import type { User } from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { validateAccessToken } from '@/lib/cli-auth';
import { authOptions } from '@/server/auth';
import prisma from '@/server/db';

/**
 * GET /api/user
 * Get current authenticated user details
 * Supports both token-based auth (CLI, PAT, integrations) and session-based auth (web)
 */
export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;

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

    return NextResponse.json(user satisfies User);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'internal_error', error_description: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}
