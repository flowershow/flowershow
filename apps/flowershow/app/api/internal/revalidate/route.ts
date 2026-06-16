import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';

export async function POST(request: Request) {
  const secret = request.headers.get('x-internal-secret');
  if (!env.INTERNAL_API_SECRET || secret !== env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { tag?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.tag) {
    return NextResponse.json({ error: 'Missing tag' }, { status: 400 });
  }

  revalidateTag(body.tag);
  return NextResponse.json({ revalidated: true });
}
