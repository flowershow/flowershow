import {
  CreateSiteRequestSchema,
  type CreateSiteResponse,
  type ListSitesResponse,
} from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { checkCliVersion, validateAccessToken } from '@/lib/cli-auth';
import PostHogClient from '@/lib/server-posthog';
import { ensureSiteCollection } from '@/lib/typesense';
import prisma from '@/server/db';

/**
 * POST /api/sites
 * Create a new site for direct publishing (CLI, Obsidian plugin, or other integrations)
 * Accepts both fs_cli_* and fs_pat_* tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Check CLI version
    const versionError = checkCliVersion(request);
    if (versionError) return versionError;

    // Validate access token (CLI or PAT)
    const auth = await validateAccessToken(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Not authenticated' },
        { status: 401 },
      );
    }

    // Parse request body
    const parsedBody = CreateSiteRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Invalid request body' },
        { status: 400 },
      );
    }

    const { projectName, overwrite = false } = parsedBody.data;

    // Sanitize project name (alphanumeric, hyphens, underscores only)
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');
    if (sanitizedName.length < 1 || sanitizedName.length > 100) {
      return NextResponse.json(
        {
          error: 'invalid_project_name',
          message: 'Project name must be 1-100 characters',
        },
        { status: 400 },
      );
    }

    // Check if site already exists
    const existingSite = await prisma.site.findFirst({
      where: {
        userId: auth.userId,
        projectName: sanitizedName,
      },
    });

    if (existingSite && !overwrite) {
      return NextResponse.json(
        {
          error: 'site_exists',
          message: `A site named '${sanitizedName}' already exists.`,
        },
        { status: 409 },
      );
    }

    // Get user info for URL generation
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { username: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'User not found' },
        { status: 404 },
      );
    }

    const username = user.username;
    if (!username) {
      return NextResponse.json(
        { error: 'no_username', message: 'User has no username set' },
        { status: 400 },
      );
    }

    let site;

    if (existingSite && overwrite) {
      // Delete existing blobs
      await prisma.blob.deleteMany({
        where: { siteId: existingSite.id },
      });

      // Update existing site
      site = await prisma.site.update({
        where: { id: existingSite.id },
        data: {
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new site
      site = await prisma.site.create({
        data: {
          projectName: sanitizedName,
          autoSync: false,
          userId: auth.userId,
        },
      });
    }

    // Generate site URL
    const siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${sanitizedName}`;

    // Ensure Typesense collection exists for search indexing
    await ensureSiteCollection(site.id);

    const response: CreateSiteResponse = {
      site: {
        id: site.id,
        projectName: site.projectName,
        url: siteUrl,
        userId: site.userId,
        createdAt: site.createdAt.toISOString(),
      },
    };

    return NextResponse.json(response, {
      status: existingSite && overwrite ? 200 : 201,
    });
  } catch (error) {
    console.error('Error creating site:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', { route: 'POST /api/sites' });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create site' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/sites
 * List all sites for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Check CLI version
    const versionError = checkCliVersion(request);
    if (versionError) return versionError;

    // Validate access token (CLI or PAT)
    const auth = await validateAccessToken(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Not authenticated' },
        { status: 401 },
      );
    }

    // Get user info for URL generation
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { username: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'User not found' },
        { status: 404 },
      );
    }

    const username = user.username;

    // Fetch all sites for the user
    const sites = await prisma.site.findMany({
      where: {
        userId: auth.userId,
      },
      select: {
        id: true,
        projectName: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { blobs: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Format response
    const formattedSites = sites.map((site) => ({
      id: site.id,
      projectName: site.projectName,
      url: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`,
      fileCount: site._count.blobs,
      updatedAt: site.updatedAt.toISOString(),
      createdAt: site.createdAt.toISOString(),
    }));

    const response: ListSitesResponse = {
      sites: formattedSites,
      total: formattedSites.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error listing sites:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', { route: 'GET /api/sites' });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to list sites' },
      { status: 500 },
    );
  }
}
