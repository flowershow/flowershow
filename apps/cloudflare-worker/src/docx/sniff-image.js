/**
 * Identify an image by its magic bytes, ignoring whatever type the document
 * declares for it. Only the types we are willing to serve are recognised.
 *
 * @param {Uint8Array} bytes
 * @returns {'png'|'jpg'|'gif'|'webp'|null}
 */
export function sniffImageType(bytes) {
  const starts = (sig, offset = 0) =>
    bytes.length >= offset + sig.length &&
    sig.every((b, i) => bytes[offset + i] === b);

  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (starts([0xff, 0xd8, 0xff])) return 'jpg';
  // "GIF87a" / "GIF89a"
  if (
    starts([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    starts([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  )
    return 'gif';
  // "RIFF" <size> "WEBP"
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8))
    return 'webp';
  return null;
}
