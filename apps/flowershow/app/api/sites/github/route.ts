import {
  type CreateGitHubSiteResponse,
  CreateGitHubSiteRequestSchema,
} from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { checkCliVersion, validateAccessToken } from '@/lib/cli-auth';
import { checkIfBranchExists } from '@/lib/github';
import { inngest } from '@/inngest/client';
import PostHogClient from '@/lib/server-posthog';
import { ensureSiteCollection } from '@/lib/typesense';
import prisma from '@/server/db';

/**
 * POST /api/sites/github
 * Create a new site connected to a GitHub repository via GitHub App installation.
 * Requires a Bearer token (fs_cli_* or fs_pat_*) and a valid installationId.
 */
export async function POST(request: NextRequest) {
  try {
    const versionError = checkCliVersion(request);
    if (versionError) return versionError;

    const auth = await validateAccessToken(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const parsedBody = CreateGitHubSiteRequestSchema.safeParse(
      await request.json(),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          message: parsedBody.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join(', '),
        },
        { status: 400 },
      );
    }

    const { ghRepository, ghBranch, rootDir, projectName, installationId } =
      parsedBody.data;

    // Verify the user has a username
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { username: true },
    });

    if (!user?.username) {
      return NextResponse.json(
        { error: 'no_username', message: 'User has no username set' },
        { status: 400 },
      );
    }

    // Verify the installation exists and belongs to this user
    const installation = await prisma.gitHubInstallation.findFirst({
      where: {
        id: installationId,
        userId: auth.userId,
      },
    });

    if (!installation) {
      return NextResponse.json(
        {
          error: 'installation_not_found',
          message: `GitHub App installation '${installationId}' not found or does not belong to you`,
        },
        { status: 404 },
      );
    }

    // Validate the branch exists in the repository
    const branchExists = await checkIfBranchExists({
      ghRepository,
      ghBranch,
      accessToken: '',
      installationId,
    });

    if (!branchExists) {
      return NextResponse.json(
        {
          error: 'branch_not_found',
          message: `Branch '${ghBranch}' does not exist in repository '${ghRepository}'`,
        },
        { status: 400 },
      );
    }

    // Determine a unique project name (fall back to repo name if not provided)
    const repoName = ghRepository.split('/')[1] ?? ghRepository;
    const baseName = projectName?.trim() || repoName;
    const uniqueProjectName = await ensureUniqueProjectName(
      auth.userId,
      baseName,
    );

    // Create the site
    const site = await prisma.site.create({
      data: {
        projectName: uniqueProjectName,
        ghRepository,
        ghBranch,
        rootDir: rootDir ?? null,
        autoSync: true,
        userId: auth.userId,
        installationId,
      },
    });

    // Ensure Typesense search collection exists
    await ensureSiteCollection(site.id);

    // Kick off initial sync via Inngest
    await inngest.send({
      name: 'site/sync',
      data: {
        siteId: site.id,
        ghRepository,
        ghBranch,
        rootDir: site.rootDir,
        accessToken: '',
        installationId,
      },
    });

    const posthog = PostHogClient();
    posthog.capture({
      distinctId: auth.userId,
      event: 'site_created',
      properties: { id: site.id, source: 'api_github' },
    });
    await posthog.shutdown();

    const siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${user.username}/${uniqueProjectName}`;

    const response: CreateGitHubSiteResponse = {
      site: {
        id: site.id,
        projectName: site.projectName,
        url: siteUrl,
        ghRepository: site.ghRepository!,
        ghBranch: site.ghBranch!,
        rootDir: site.rootDir,
        autoSync: site.autoSync,
        userId: site.userId,
        createdAt: site.createdAt.toISOString(),
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating GitHub-connected site:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', {
      route: 'POST /api/sites/github',
    });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create site' },
      { status: 500 },
    );
  }
}

async function ensureUniqueProjectName(
  userId: string,
  base: string,
): Promise<string> {
  let name = base;
  let n = 2;
  while (
    await prisma.site.findFirst({
      where: { userId, projectName: name },
      select: { id: true },
    })
  ) {
    name = `${base}-${n}`;
    n++;
  }
  return name;
}
