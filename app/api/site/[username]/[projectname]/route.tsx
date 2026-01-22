import { NextRequest, NextResponse } from 'next/server';
import { InternalSite, internalSiteSelect } from '@/lib/db/internal';
import prisma from '@/server/db';
import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';

export async function GET(
  req: NextRequest,
  props: {
    params: Promise<{
      username: string;
      projectname: string;
    }>;
  },
) {
  const params = await props.params;
  const { username, projectname } = params;
  let site: InternalSite | null = null;

  if (username === '_domain') {
    site = await prisma.site.findUnique({
      where: {
        customDomain: projectname,
      },
      select: internalSiteSelect,
    });
  } else if (username === 'anon') {
    site = await prisma.site.findFirst({
      where: {
        projectName: projectname,
        userId: ANONYMOUS_USER_ID,
      },
      select: internalSiteSelect,
    });
  } else {
    site = await prisma.site.findFirst({
      where: {
        user: {
          username,
        },
        projectName: projectname,
      },
      select: internalSiteSelect,
    });
  }

  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(site);
}
