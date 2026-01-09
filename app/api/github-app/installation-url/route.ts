import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { env } from '@/env.mjs';
import { getSession } from '@/server/auth';
import * as Sentry from '@sentry/nextjs';

/**
 * Generate GitHub App installation URL
 * POST /api/github-app/installation-url
 */
export async function POST(request: Request) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/github-app/installation-url',
    },
    async () => {
      try {
        const session = await getSession();

        if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { suggestedTargetId } = body;

        // Create a signed JWT token with user ID
        // This allows us to identify the user in the callback without relying on cookies
        const secret = new TextEncoder().encode(env.NEXTAUTH_SECRET);
        const state = await new SignJWT({ userId: session.user.id })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('15m') // Token expires in 15 minutes
          .sign(secret);

        // Build GitHub App installation URL
        const installUrl = new URL(
          `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`,
        );

        installUrl.searchParams.set('state', state);

        if (suggestedTargetId) {
          installUrl.searchParams.set('suggested_target_id', suggestedTargetId);
        }

        return NextResponse.json({
          url: installUrl.toString(),
          state,
        });
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error generating installation URL:', error);
        return NextResponse.json(
          { error: 'Failed to generate installation URL' },
          { status: 500 },
        );
      }
    },
  );
}
