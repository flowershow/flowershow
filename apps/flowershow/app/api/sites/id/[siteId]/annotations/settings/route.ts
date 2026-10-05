import {
  type AnnotationSettings,
  UpdateAnnotationSettingsRequestSchema,
} from '@flowershow/api-contract';
import type { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { annotationSettingsFor } from '@/lib/annotations/server';
import {
  authorizeOwner,
  errorResponse,
  invalidBodyResponse,
} from '@/lib/annotations/http';
import { checkCliVersion } from '@/lib/cli-auth';
import prisma from '@/server/db';

type Props = { params: Promise<{ siteId: string }> };

async function ownedSite(request: NextRequest, props: Props) {
  const versionError = checkCliVersion(request);
  if (versionError) return { site: undefined, response: versionError };
  const { siteId } = await props.params;
  const owner = await authorizeOwner(request, () =>
    prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        userId: true,
        configJson: true,
        isTemporary: true,
        anonymousOwnerId: true,
      },
    }),
  );
  return 'response' in owner
    ? { site: undefined, response: owner.response }
    : { site: owner.site, response: undefined };
}

/** GET /api/sites/id/:siteId/annotations/settings */
export async function GET(request: NextRequest, props: Props) {
  const { site, response } = await ownedSite(request, props);
  if (!site) return response;
  return NextResponse.json(
    (await annotationSettingsFor(prisma, site)) satisfies AnnotationSettings,
  );
}

/** PATCH /api/sites/id/:siteId/annotations/settings { annotations } */
export async function PATCH(request: NextRequest, props: Props) {
  const { site, response } = await ownedSite(request, props);
  if (!site) return response;
  const parsed = UpdateAnnotationSettingsRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return invalidBodyResponse(parsed.error, 'Invalid settings');
  if (site.isTemporary && site.anonymousOwnerId) {
    return errorResponse(
      400,
      'bad_request',
      'Annotations are not available on sites published without an account. Claim the site first.',
    );
  }
  const configJson = {
    ...((site.configJson ?? {}) as Record<string, unknown>),
    annotations: parsed.data.annotations,
  };
  await prisma.site.update({
    where: { id: site.id },
    data: { configJson: configJson as Prisma.InputJsonValue },
  });
  // Same tags as updateDbConfig in server/api/routers/site.ts.
  revalidateTag(site.id);
  revalidateTag(`${site.id}-config`);
  const settings = await annotationSettingsFor(
    prisma,
    { id: site.id, configJson },
    { fresh: true },
  );
  return NextResponse.json(settings satisfies AnnotationSettings);
}
