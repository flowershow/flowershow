/** Extract decoded URL from Next.js Image src query param */
export function decodedImageSrc(src: string) {
  return decodeURIComponent(
    new URL(src, 'http://localhost').searchParams.get('url')!,
  );
}
