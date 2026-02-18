import { NextResponse } from 'next/server';
import { log, SeverityNumber } from '@/lib/otel-logger';
import PostHogClient from '@/lib/server-posthog';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';

/**
 * List user's GitHub App installations and accessible repositories
 * GET /api/github-app/installations
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's installations with repositories
    const installations = await prisma.gitHubInstallation.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        repositories: {
          orderBy: {
            repositoryName: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    log('GET /api/github-app/installations', SeverityNumber.INFO, {
      installations_count: installations.length,
    });

    // Format response
    const response = {
      installations: installations.map((installation) => ({
        id: installation.id,
        installationId: installation.installationId.toString(),
        accountLogin: installation.accountLogin,
        accountType: installation.accountType,
        repositories: installation.repositories.map((repo) => ({
          id: repo.id,
          repositoryId: repo.repositoryId.toString(),
          name: repo.repositoryName,
          fullName: repo.repositoryFullName,
          isPrivate: repo.isPrivate,
        })),
        suspendedAt: installation.suspendedAt?.toISOString() || null,
        createdAt: installation.createdAt.toISOString(),
        updatedAt: installation.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', {
      route: 'GET /api/github-app/installations',
    });
    await posthog.shutdown();
    console.error('Error fetching installations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch installations' },
      { status: 500 },
    );
  }
}
