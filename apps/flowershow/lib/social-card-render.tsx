import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SocialCard } from '@/components/og/social-card';
import type { CardInputs } from '@/lib/social-preview';

const OG_DIR = join(process.cwd(), 'components/og');
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);

let assets: Promise<{
  fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts'];
  markSrc: string;
}> | null = null;

function loadAssets() {
  assets ??= (async () => {
    const [serif, inter400, inter600, mark] = await Promise.all([
      readFile(join(OG_DIR, 'fonts/SourceSerif4-SemiBold.woff')),
      readFile(join(OG_DIR, 'fonts/Inter-Regular.woff')),
      readFile(join(OG_DIR, 'fonts/Inter-SemiBold.woff')),
      readFile(join(OG_DIR, 'flowershow-mark.png')),
    ]);
    return {
      fonts: [
        {
          name: 'Source Serif 4',
          data: serif,
          weight: 600 as const,
          style: 'normal' as const,
        },
        {
          name: 'Inter',
          data: inter400,
          weight: 400 as const,
          style: 'normal' as const,
        },
        {
          name: 'Inter',
          data: inter600,
          weight: 600 as const,
          style: 'normal' as const,
        },
      ],
      markSrc: `data:image/png;base64,${mark.toString('base64')}`,
    };
  })();
  // Don't cache a failed load forever.
  assets.catch(() => {
    assets = null;
  });
  return assets;
}

/** Fetches a logo for the card. Never throws; anything unusable → null (monogram). */
export async function loadImageDataUri(
  url: string | null,
  opts: {
    timeoutMs?: number;
    maxBytes?: number;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null; // emoji, unresolved relative path
  const { timeoutMs = 1500, maxBytes = 2_000_000, fetchImpl = fetch } = opts;
  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim();
    if (!ALLOWED.has(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Renders the card fully (so render errors surface here, not mid-stream). */
export async function renderSocialCardPng(
  inputs: CardInputs,
  displayUrl: string,
): Promise<ArrayBuffer> {
  const [{ fonts, markSrc }, logoSrc] = await Promise.all([
    loadAssets(),
    loadImageDataUri(inputs.logo),
  ]);
  const res = new ImageResponse(
    <SocialCard
      siteName={inputs.siteName}
      logoSrc={logoSrc}
      title={inputs.page?.title ?? inputs.siteName}
      description={
        inputs.page ? inputs.page.description : inputs.siteDescription
      }
      displayUrl={displayUrl}
      showMark={inputs.showMark}
      markSrc={markSrc}
    />,
    { width: 1200, height: 630, fonts, emoji: 'twemoji' },
  );
  return res.arrayBuffer();
}
