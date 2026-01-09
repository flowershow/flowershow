import * as Sentry from '@sentry/nextjs';
import { jwtVerify } from 'jose';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { getInstallationToken } from '@/lib/github';
import prisma from '@/server/db';

const isSecure =
  env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
const protocol = isSecure ? 'https' : 'http';

interface GitHubInstallation {
  id: number;
  account: {
    id: number;
    login: string;
    type: 'User' | 'Organization';
  };
  repository_selection: 'all' | 'selected';
  suspended_at: string | null;
  suspended_by: string | null;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

/**
 * Handle GitHub App installation callback
 * GET /api/github-app/callback
 */
export async function GET(request: Request) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'GET /api/github-app/callback',
    },
    async (span) => {
      try {
        const { searchParams } = new URL(request.url);
        const installationId = searchParams.get('installation_id');
        const setupAction = searchParams.get('setup_action'); // 'install' | 'update'
        const state = searchParams.get('state');

        if (!installationId) {
          return NextResponse.redirect(
            `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}?error=missing_installation_id`,
          );
        }

        if (!state) {
          return NextResponse.redirect(
            `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}?error=missing_state`,
          );
        }

        // Verify the JWT token from state parameter to get user ID
        let userId: string;
        try {
          const secret = new TextEncoder().encode(env.NEXTAUTH_SECRET);
          const { payload } = await jwtVerify(state, secret);
          userId = payload.userId as string;

          if (!userId) {
            throw new Error('Invalid token payload');
          }
        } catch (error) {
          console.error('Failed to verify state token:', error);
          return NextResponse.redirect(
            `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}?error=invalid_state`,
          );
        }

        span.setAttribute('installation_id', installationId);
        span.setAttribute('setup_action', setupAction || 'unknown');

        // Generate GitHub App JWT for authenticating as the app itself
        const now = Math.floor(Date.now() / 1000);
        const jwtPayload = {
          iat: now,
          exp: now + 600, // 10 minutes
          iss: env.GITHUB_APP_ID,
        };
        // Convert escaped newlines to actual newlines in private key
        const privateKey = env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n');
        const appJWT = jwt.sign(jwtPayload, privateKey, {
          algorithm: 'RS256',
        });

        // Fetch installation details using GitHub App JWT
        const installationResponse = await fetch(
          `https://api.github.com/app/installations/${installationId}`,
          {
            headers: {
              Authorization: `Bearer ${appJWT}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        );

        if (!installationResponse.ok) {
          throw new Error(
            `Failed to fetch installation: ${installationResponse.statusText}`,
          );
        }

        const installation =
          (await installationResponse.json()) as GitHubInstallation;

        // Store installation in database
        const dbInstallation = await prisma.gitHubInstallation.upsert({
          where: {
            installationId: BigInt(installation.id),
          },
          create: {
            installationId: BigInt(installation.id),
            accountType: installation.account.type,
            accountLogin: installation.account.login,
            accountId: BigInt(installation.account.id),
            userId: userId,
            suspendedAt: installation.suspended_at
              ? new Date(installation.suspended_at)
              : null,
            suspendedBy: installation.suspended_by,
          },
          update: {
            accountType: installation.account.type,
            accountLogin: installation.account.login,
            accountId: BigInt(installation.account.id),
            suspendedAt: installation.suspended_at
              ? new Date(installation.suspended_at)
              : null,
            suspendedBy: installation.suspended_by,
            updatedAt: new Date(),
          },
        });

        // Get installation access token for fetching repositories
        const installationAccessToken = await getInstallationToken(
          dbInstallation.id,
        );

        // Fetch all accessible repositories using installation access token with pagination
        let allRepositories: GitHubRepository[] = [];
        let page = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          const reposResponse = await fetch(
            `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
            {
              headers: {
                Authorization: `Bearer ${installationAccessToken}`,
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
            total_count: number;
            repositories: GitHubRepository[];
          };

          allRepositories = [...allRepositories, ...reposData.repositories];

          // Check if there are more pages
          // GitHub returns up to 100 repos per page, so if we got less than 100, we're done
          hasMorePages = reposData.repositories.length === 100;
          page++;
        }

        // Delete existing repositories for this installation
        await prisma.gitHubInstallationRepository.deleteMany({
          where: {
            installationId: dbInstallation.id,
          },
        });

        // Store accessible repositories
        if (allRepositories.length > 0) {
          await prisma.gitHubInstallationRepository.createMany({
            data: allRepositories.map((repo) => ({
              installationId: dbInstallation.id,
              repositoryId: BigInt(repo.id),
              repositoryName: repo.name,
              repositoryFullName: repo.full_name,
              isPrivate: repo.private,
            })),
          });
        }

        span.setAttribute('repositories_count', allRepositories.length);

        // Redirect to a success page that will close popup or redirect
        const redirectUrl = new URL(
          '/api/github-app/callback-success',
          `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
        );
        redirectUrl.searchParams.set('setup_action', setupAction || 'install');

        return NextResponse.redirect(redirectUrl.toString());
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error handling GitHub App callback:', error);
        return NextResponse.redirect(
          `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}?error=callback_failed`,
        );
      }
    },
  );
}
