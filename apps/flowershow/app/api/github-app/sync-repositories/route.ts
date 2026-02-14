import { NextResponse } from 'next/server';
import { getSession } from '@/server/auth';
import { getInstallationToken } from '@/lib/github';
import prisma from '@/server/db';
import * as Sentry from '@sentry/nextjs';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

/**
 * Manually sync repositories for an installation
 * POST /api/github-app/sync-repositories
 */
export async function POST(request: Request) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/github-app/sync-repositories',
    },
    async (span) => {
      try {
        const session = await getSession();

        if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { installationId } = body;

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

        if (!installation || installation.userId !== session.user.id) {
          return NextResponse.json(
            { error: 'Installation not found' },
            { status: 404 },
          );
        }

        // Get installation access token
        const accessToken = await getInstallationToken(installation.id);

        // Fetch accessible repositories
        const reposResponse = await fetch(
          `https://api.github.com/installation/repositories`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        );

        if (!reposResponse.ok) {
          throw new Error(
            `Failed to fetch repositories: ${reposResponse.statusText}`,
          );
        }

        const reposData = (await reposResponse.json()) as {
          repositories: GitHubRepository[];
        };

        // Delete existing repositories for this installation
        await prisma.gitHubInstallationRepository.deleteMany({
          where: {
            installationId: installation.id,
          },
        });

        // Store accessible repositories
        if (reposData.repositories.length > 0) {
          await prisma.gitHubInstallationRepository.createMany({
            data: reposData.repositories.map((repo) => ({
              installationId: installation.id,
              repositoryId: BigInt(repo.id),
              repositoryName: repo.name,
              repositoryFullName: repo.full_name,
              isPrivate: repo.private,
            })),
          });
        }

        // Update installation timestamp
        await prisma.gitHubInstallation.update({
          where: {
            id: installation.id,
          },
          data: {
            updatedAt: new Date(),
          },
        });

        span.setAttribute('repositories_synced', reposData.repositories.length);

        return NextResponse.json({
          success: true,
          repositoriesCount: reposData.repositories.length,
        });
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error syncing repositories:', error);
        return NextResponse.json(
          { error: 'Failed to sync repositories' },
          { status: 500 },
        );
      }
    },
  );
}
