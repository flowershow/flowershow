import {
  type HeadlessUploadResponse,
  HeadlessUploadRequestSchema,
  type UploadTarget,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { validateAccessToken } from '@/lib/cli-auth';
import { authOptions } from '@/server/auth';
import {
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import {
  MAX_FILE_SIZE,
  MAX_FILES,
  MAX_TOTAL_SIZE,
  PRESIGNED_URL_TTL,
} from '@/lib/publish-limits';
import prisma from '@/server/db';

/**
 * POST /api/sites/id/:siteId/files/headless
 *
 * Upload files to an existing site without creating Publish/PublishFile records.
 * The queue consumer handles Blob upsert and Typesense indexing as normal.
 * No publish lifecycle, publish history, or cache revalidation is triggered.
 *
 * Use this for bulk imports or tooling that manages its own lifecycle.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
    let userId: string | null = null;
    const tokenAuth = await validateAccessToken(request);
    if (tokenAuth?.userId) {
      userId = tokenAuth.userId;
    } else {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }
    if (!userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { siteId } = await props.params;

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, userId: true },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'not_found', message: 'Site not found' },
        { status: 404 },
      );
    }

    if (site.userId !== userId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'You do not have access to this site' },
        { status: 403 },
      );
    }

    const parsedBody = HeadlessUploadRequestSchema.safeParse(
      await request.json(),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'files array is required' },
        { status: 400 },
      );
    }

    const { files } = parsedBody.data;

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: 'payload_too_large',
          message: `Maximum ${MAX_FILES} files per request`,
        },
        { status: 413 },
      );
    }

    let totalSize = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: 'file_too_large',
            message: `File ${file.path} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          },
          { status: 413 },
        );
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        {
          error: 'payload_too_large',
          message: `Total upload size exceeds maximum of ${MAX_TOTAL_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 },
      );
    }

    const uploadTargets: UploadTarget[] = await Promise.all(
      files.map(async (file) => {
        const extension = file.path.split('.').pop()?.toLowerCase() ?? '';
        const s3Key = `${siteId}/main/raw/${file.path}`;
        const contentType = getContentType(extension);
        const uploadUrl = await generatePresignedUploadUrl(
          s3Key,
          PRESIGNED_URL_TTL,
          contentType,
        );
        return { path: file.path, uploadUrl, contentType };
      }),
    );

    const response: HeadlessUploadResponse = { files: uploadTargets };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating headless upload URLs:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to generate upload URLs' },
      { status: 500 },
    );
  }
}
