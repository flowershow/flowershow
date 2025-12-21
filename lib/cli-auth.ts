import { NextRequest } from 'next/server';
import prisma from '@/server/db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure device code
 * Format: 40 character alphanumeric string
 */
export function generateDeviceCode(): string {
  return randomBytes(30).toString('base64url');
}

/**
 * Generate a human-friendly user code
 * Format: XXXX-XXXX (8 characters, uppercase alphanumeric)
 */
export function generateUserCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters
  let code = '';

  for (let i = 0; i < 8; i++) {
    if (i === 4) {
      code += '-';
    }
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }

  return code;
}

/**
 * Generate a CLI access token
 * Format: fs_cli_ + 32 character base64url string
 */
export function generateCliToken(): string {
  const tokenBytes = randomBytes(32).toString('base64url');
  return `fs_cli_${tokenBytes}`;
}

/**
 * Hash a CLI token for storage
 */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 12);
}

/**
 * Validate a CLI token from Authorization header
 * Returns userId if valid, null otherwise
 */
export async function validateCliToken(
  request: NextRequest,
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  if (!token.startsWith('fs_cli_')) {
    return null;
  }

  // Find all non-expired tokens
  const cliTokens = await prisma.cliToken.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    select: {
      id: true,
      token: true,
      userId: true,
    },
  });

  // Check each token (constant-time comparison via bcrypt)
  for (const record of cliTokens) {
    const isValid = await bcrypt.compare(token, record.token);
    if (isValid) {
      // Update last used timestamp (fire and forget)
      prisma.cliToken
        .update({
          where: { id: record.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {
          // Ignore errors in background update
        });

      return { userId: record.userId };
    }
  }

  return null;
}

/**
 * Format user code for display (add hyphen if not present)
 */
export function formatUserCode(code: string): string {
  const cleaned = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (cleaned.length !== 8) {
    return code;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

/**
 * Validate user code format
 */
export function isValidUserCodeFormat(code: string): boolean {
  const cleaned = code.replace(/[^A-Z0-9]/gi, '');
  return cleaned.length === 8;
}

/**
 * Clean up expired device codes
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredDeviceCodes(): Promise<number> {
  const result = await prisma.deviceCode.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
