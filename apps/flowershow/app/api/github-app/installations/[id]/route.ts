import type { DeleteInstallationResponse } from '@flowershow/api-contract';
import { NextResponse } from 'next/server';
import { clearInstallationTokenCache } from '@/lib/github';
import { log, SeverityNumber } from '@/lib/otel-logger';
import PostHogClient from '@/lib/server-posthog';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';

/**
 * Delete installation from database
 * DELETE /api/github-app/installations/:id
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    log('DELETE /api/github-app/installations/:id', SeverityNumber.INFO, {
      installation_id: installationId,
    });

    const response: DeleteInstallationResponse = {
      success: true,
      message: 'Installation removed successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', {
      route: 'DELETE /api/github-app/installations/:id',
    });
    await posthog.shutdown();
    console.error('Error deleting installation:', error);
    return NextResponse.json(
      { error: 'Failed to delete installation' },
      { status: 500 },
    );
  }
}
