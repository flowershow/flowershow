import { NextResponse } from 'next/server';
import { getSession } from '@/server/auth';
import { clearInstallationTokenCache } from '@/lib/github';
import prisma from '@/server/db';
import * as Sentry from '@sentry/nextjs';

/**
 * Delete installation from database
 * DELETE /api/github-app/installations/:id
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'DELETE /api/github-app/installations/:id',
    },
    async (span) => {
      try {
        const session = await getSession();

        if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: installationId } = await params;

        if (!installationId) {
          return NextResponse.json(
            { error: 'Installation ID is required' },
            { status: 400 },
          );
        }

        span.setAttribute('installation_id', installationId);

        // Verify installation belongs to user
        const installation = await prisma.gitHubInstallation.findUnique({
          where: {
            id: installationId,
          },
        });

        if (!installation) {
          return NextResponse.json(
            { error: 'Installation not found' },
            { status: 404 },
          );
        }

        if (installation.userId !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Clear cached token
        clearInstallationTokenCache(installation.installationId.toString());

        // Delete installation (cascade will delete repositories and update sites)
        await prisma.gitHubInstallation.delete({
          where: {
            id: installationId,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Installation removed successfully',
        });
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error deleting installation:', error);
        return NextResponse.json(
          { error: 'Failed to delete installation' },
          { status: 500 },
        );
      }
    },
  );
}
