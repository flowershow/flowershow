/**
 * Extract the original image URL from a Next.js Image `src` attribute.
 * Next.js Image optimization rewrites src to `/_next/image?url=<encoded>&w=...&q=...`.
 * Returns the original URL, or the input unchanged if not a Next.js image URL.
 */
export function decodeImageSrc(src: string): string {
  if (!src.includes('/_next/image')) return src;
  try {
    const url = new URL(src, 'http://localhost');
    const original = url.searchParams.get('url');
    return original ? decodeURIComponent(original) : src;
  } catch {
    return src;
  }
}
