import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';
import { PublicSite } from '@/server/api/types';

/**
 * Creates the tRPC context required for API calls.
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

export async function GET(
  req: NextRequest,
  props: {
    params: Promise<{
      username: string;
      projectName: string;
      path?: string[];
    }>;
  },
) {
  const params = await props.params;
  const ctx = await createContext(req);
  const caller = appRouter.createCaller(ctx);
  // NOTE currently branch is not implemented and is always equal to "-"
  /* const { username, projectName, branch, slug } = params; */
  const { username, projectName, path } = params;

  if (!path || path.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  let site: PublicSite | null = null;

  if (username === '_domain') {
    site = await caller.site.getByDomain({
      domain: projectName,
    });
  } else {
    site = await caller.site.get({
      ghUsername: username!,
      projectName: projectName!,
    });
  }

  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // In development with MinIO, use http://. In production with R2, use https://
  const protocol =
    process.env.NODE_ENV === 'development' ? 'http://' : 'https://';
  const encodedPath = path
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const R2FileUrl = `${protocol}${env.NEXT_PUBLIC_S3_BUCKET_DOMAIN}/${site.id}/${site.ghBranch}/raw/${encodedPath}`;

  return NextResponse.redirect(R2FileUrl, { status: 302 });
}
