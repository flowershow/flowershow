import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || !token.startsWith('fs_cli_')) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid token format' },
        { status: 400 },
      );
    }

    // Find all tokens and check which one matches
    const cliTokens = await prisma.cliToken.findMany({
      select: {
        id: true,
        token: true,
      },
    });

    let tokenId: string | null = null;

    for (const record of cliTokens) {
      const isValid = await bcrypt.compare(token, record.token);
      if (isValid) {
        tokenId = record.id;
        break;
      }
    }

    if (tokenId) {
      await prisma.cliToken.delete({
        where: { id: tokenId },
      });
    }

    // Always return success (don't reveal if token existed)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in device revoke:', error);
    return NextResponse.json(
      { error: 'internal_error', error_description: 'Failed to revoke token' },
      { status: 500 },
    );
  }
}
