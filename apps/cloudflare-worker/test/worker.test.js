import assert from 'node:assert';
import { test } from 'node:test';
import { validateEnv } from '../src/worker.js';

test('validateEnv throws when DATABASE_URL is missing', () => {
  assert.throws(() => validateEnv({}), /Missing required env var: DATABASE_URL/);
});

test('validateEnv throws when DATABASE_URL is empty string', () => {
  assert.throws(
    () => validateEnv({ DATABASE_URL: '' }),
    /Missing required env var: DATABASE_URL/,
  );
});

test('validateEnv passes when all required vars are present', () => {
  assert.doesNotThrow(() =>
    validateEnv({ DATABASE_URL: 'postgres://localhost/db' }),
  );
});
