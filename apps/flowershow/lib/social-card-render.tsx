import { lookup } from 'node:dns/promises';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { PAPER, SocialCard } from '@/components/og/social-card';
import type { CardImage, CardInputs } from '@/lib/social-preview';

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

type Resolver = (host: string) => Promise<string[]>;

const defaultResolve: Resolver = async (host) =>
  (await lookup(host, { all: true })).map((r) => r.address);

function isPrivateV4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return true; // unparseable → treat as unsafe
  const [a, b] = p as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateV4(ip);
  if (kind !== 6) return true;
  const v = ip.toLowerCase();
  if (v === '::' || v === '::1') return true;
  // IPv4-mapped, dotted (::ffff:1.2.3.4) or hex (::ffff:7f00:1)
  const dotted = v.match(/^(?:0*:)*:?ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return isPrivateV4(dotted[1]!);
  const hex = v.match(/^(?:0*:)*:?ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1]!, 16);
    const lo = parseInt(hex[2]!, 16);
    return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  const first = parseInt(v.split(':')[0] || '0', 16);
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80;
}

/** SSRF guard: https (http outside production), no internal hostnames, no private IPs (also after DNS). */
export async function isFetchableImageUrl(
  url: string,
  { resolve = defaultResolve }: { resolve?: Resolver } = {},
): Promise<boolean> {
  try {
    const u = new URL(url);
    if (
      u.protocol !== 'https:' &&
      !(u.protocol === 'http:' && process.env.NODE_ENV !== 'production')
    )
      return false;
    const host = u.hostname
      .replace(/^\[|\]$/g, '')
      .toLowerCase()
      .replace(/\.$/, '');
    if (!host) return false;
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    )
      return false;
    if (isIP(host)) return !isPrivateIp(host);
    const addrs = await resolve(host);
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a));
  } catch {
    return false;
  }
}

const MAX_REDIRECTS = 3;

async function readCapped(
  res: Response,
  maxBytes: number,
): Promise<Buffer | null> {
  const declared = Number(res.headers.get('content-length'));
  if (declared > maxBytes) return null;
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

type FetchOpts = {
  timeoutMs?: number;
  maxBytes?: number;
  fetchImpl?: typeof fetch;
  resolve?: Resolver;
};

/** SSRF-guarded fetch of an external image of an allowed type. Never throws. */
async function fetchImage(
  url: string,
  allowed: Set<string>,
  {
    timeoutMs = 1500,
    maxBytes = 2_000_000,
    fetchImpl = fetch,
    resolve,
  }: FetchOpts,
): Promise<{ type: string; buf: Buffer } | null> {
  try {
    const signal = AbortSignal.timeout(timeoutMs);
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!(await isFetchableImageUrl(current, { resolve }))) return null;
      const res = await fetchImpl(current, { signal, redirect: 'manual' });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return null;
        current = new URL(loc, current).toString();
        continue;
      }
      if (!res.ok) return null;
      const type = (res.headers.get('content-type') ?? '')
        .split(';')[0]!
        .trim();
      if (!allowed.has(type)) return null;
      const buf = await readCapped(res, maxBytes);
      return buf ? { type, buf } : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetches a logo for the card. Never throws; anything unusable → null (monogram). */
export async function loadImageDataUri(
  url: string | null,
  opts: FetchOpts = {},
): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null; // emoji, unresolved relative path
  const img = await fetchImage(url, ALLOWED, opts);
  return img ? `data:${img.type};base64,${img.buf.toString('base64')}` : null;
}

/** The picture column of card A, in px. */
export const PICTURE_WIDTH = 520;
const PICTURE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/gif',
]);
const PICTURE_MAX_BYTES = 8_000_000;

export type ReadSiteFile = (
  path: string,
  maxBytes: number,
) => Promise<Buffer | null>;

/**
 * The card picture, cropped to fill the column and re-encoded as JPEG (Satori
 * reads neither WebP nor AVIF). Site files come from storage; external images
 * through the SSRF guard. Never throws: anything unusable → null (text card).
 */
export async function loadPictureDataUri(
  img: CardImage,
  { readSiteFile, ...opts }: FetchOpts & { readSiteFile: ReadSiteFile },
): Promise<string | null> {
  try {
    const buf = img.sitePath
      ? await readSiteFile(img.sitePath, PICTURE_MAX_BYTES)
      : (
          await fetchImage(img.src, PICTURE_TYPES, {
            timeoutMs: 2500,
            maxBytes: PICTURE_MAX_BYTES,
            ...opts,
          })
        )?.buf;
    if (!buf) return null;
    const jpeg = await sharp(buf, { limitInputPixels: 50_000_000 })
      .rotate()
      .flatten({ background: PAPER })
      .resize(PICTURE_WIDTH, 630, { fit: 'cover' })
      .jpeg({ quality: 88 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Renders the card fully (so render errors surface here, not mid-stream), as JPEG. */
export async function renderSocialCard(
  inputs: CardInputs,
  domain: string,
  { readSiteFile }: { readSiteFile: ReadSiteFile },
): Promise<ArrayBuffer> {
  const [{ fonts, markSrc }, logoSrc, pictureSrc] = await Promise.all([
    loadAssets(),
    loadImageDataUri(inputs.logo),
    inputs.image
      ? loadPictureDataUri(inputs.image, { readSiteFile })
      : Promise.resolve(null),
  ]);
  const res = new ImageResponse(
    <SocialCard
      siteName={inputs.siteName}
      logoSrc={logoSrc}
      title={inputs.page?.title ?? inputs.siteName}
      section={inputs.page?.section ?? null}
      domain={domain}
      showMark={inputs.showMark}
      markSrc={markSrc}
      pictureSrc={pictureSrc}
    />,
    { width: 1200, height: 630, fonts, emoji: 'twemoji' },
  );
  const png = Buffer.from(await res.arrayBuffer());
  const jpeg = await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return jpeg.buffer.slice(
    jpeg.byteOffset,
    jpeg.byteOffset + jpeg.byteLength,
  ) as ArrayBuffer;
}
