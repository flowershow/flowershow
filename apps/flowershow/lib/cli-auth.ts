import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';

/** Minimum CLI version required to use the API */
const MIN_CLI_VERSION = '1.0.0';

/**
 * Compare semver versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/**
 * Check CLI version from request header
 * Only validates if header is present (to allow PAT usage without CLI)
 * Returns error response if version is outdated, null if OK
 */
export function checkCliVersion(request: NextRequest): NextResponse | null {
  const cliVersion = request.headers.get('X-Flowershow-CLI-Version');

  // No header = not a CLI request, skip check
  if (!cliVersion) {
    return null;
  }

  if (compareSemver(cliVersion, MIN_CLI_VERSION) < 0) {
    return NextResponse.json(
      {
        error: 'client_outdated',
        message:
          'Your FlowerShow CLI is outdated and no longer works with the API.',
        currentVersion: cliVersion,
        minimumVersion: MIN_CLI_VERSION,
      },
      { status: 426 },
    );
  }

  return null;
}

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
 * Generate a PAT (Personal Access Token)
 * Format: fs_pat_ + 32 character base64url string
 */
export function generatePatToken(): string {
  const tokenBytes = randomBytes(32).toString('base64url');
  return `fs_pat_${tokenBytes}`;
}

/**
 * Hash a CLI token for storage using SHA256
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validate an access token (CLI or PAT) from Authorization header
 * Accepts both fs_cli_* and fs_pat_* token formats
 * Returns userId if valid, null otherwise
 */
export async function validateAccessToken(
  request: NextRequest,
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  // Accept both CLI and PAT token prefixes
  if (!token.startsWith('fs_cli_') && !token.startsWith('fs_pat_')) {
    return null;
  }

  // Hash token for direct database lookup (O(1) instead of O(n) bcrypt comparisons)
  const tokenHash = hashToken(token);

  // Direct lookup by hash
  const accessToken = await prisma.accessToken.findFirst({
    where: {
      token: tokenHash,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!accessToken) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  prisma.accessToken
    .update({
      where: { id: accessToken.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors in background update
    });

  return { userId: accessToken.userId };
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
