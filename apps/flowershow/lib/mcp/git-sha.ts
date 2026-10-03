import { createHash } from 'node:crypto';

/** Git blob SHA-1, the hash the sync API diffs on (same as the fl CLI). */
export function gitBlobSha(bytes: Uint8Array): string {
  return createHash('sha1')
    .update(`blob ${bytes.byteLength}\0`)
    .update(bytes)
    .digest('hex');
}
