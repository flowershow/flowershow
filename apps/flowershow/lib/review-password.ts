import {
  randomBytes,
  type ScryptOptions,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Password hashing for the review account (lib/review-login.ts). The hash
 * lives in an env var, so its format avoids `$`: Next.js expands `$NAME` in
 * .env files, which silently mangles bcrypt-style hashes.
 *
 * Format: `scrypt:<salt>:<key>`, both base64url.
 */
const PREFIX = 'scrypt';
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS: ScryptOptions = { N: 16384, r: 8, p: 1 };

export const REVIEW_PASSWORD_HASH_PATTERN =
  /^scrypt:[A-Za-z0-9_-]{22,}:[A-Za-z0-9_-]{86}$/;

/**
 * The review account's username. Sign-in and the seed script both require it,
 * because a magic-link user has no Account row to tell them apart. It lives
 * here, not in lib/review-login.ts, so the seed script avoids the app env.
 */
export const REVIEW_USERNAME = 'app-review';

function derive(password: string, salt: Buffer): Promise<Buffer> {
  const { promise, resolve, reject } = Promise.withResolvers<Buffer>();
  scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, key) =>
    err ? reject(err) : resolve(key),
  );
  return promise;
}

export async function hashReviewPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${PREFIX}:${salt.toString('base64url')}:${key.toString('base64url')}`;
}

export async function verifyReviewPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!REVIEW_PASSWORD_HASH_PATTERN.test(hash)) return false;
  const [, salt, key] = hash.split(':') as [string, string, string];
  const expected = Buffer.from(key, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'));
  return timingSafeEqual(actual, expected);
}
