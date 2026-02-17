import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * POST /api/e2e/revalidate
 * Invalidates the Next.js Data Cache for the given tags.
 * Only available in development.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const { tags } = (await request.json()) as { tags: string[] };

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return NextResponse.json({ revalidated: tags });
}
