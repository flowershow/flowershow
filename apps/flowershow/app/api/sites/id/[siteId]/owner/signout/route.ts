import type { SuccessResponse } from '@flowershow/api-contract';
import { NextResponse } from 'next/server';
import {
  ownerCookieAttributes,
  ownerCookieName,
} from '@/lib/site-owner-session';

/**
 * POST /_flowershow/owner/signout  (site host; middleware rewrites it here)
 *
 * Clears the site-scoped owner cookie on this host. The account session on
 * the cloud host is untouched.
 */
export async function POST() {
  const response = NextResponse.json(
    { success: true } satisfies SuccessResponse,
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
  response.cookies.set({
    name: ownerCookieName(),
    value: '',
    ...ownerCookieAttributes(0),
  });
  return response;
}
