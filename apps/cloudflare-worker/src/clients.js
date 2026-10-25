import { S3Client } from '@aws-sdk/client-s3';
import postgres from 'postgres';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'GITHUB_APP_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'SYNC_TRIGGER_SECRET',
];

export function validateEnv(env) {
  for (const v of REQUIRED_ENV_VARS) {
    if (!env[v]) throw new Error(`Missing required env var: ${v}`);
  }
}

export function getStorageClient(env) {
  if (env.ENVIRONMENT === 'dev') {
    const s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
    return { type: 's3', client: s3Client, bucket: env.S3_BUCKET };
  }
  return { type: 'r2', client: env.BUCKET, bucket: null };
}

export function getPostgresClient(env) {
  return postgres(env.DATABASE_URL, {
    max: 1, // Minimize connections since we can't reuse them
    idle_timeout: 2, // Reduce idle timeout since we'll create new connections
    fetch_types: false,
  });
}

/**
 * Typesense client built on the runtime's `fetch`, not the `typesense` SDK: the
 * SDK sends requests through axios, whose fetch adapter (>= 1.20) always sets
 * `cache: 'default'`, which workerd rejects, so every call failed.
 * Non-2xx responses throw an Error carrying `httpStatus`.
 */
export function getTypesenseClient(env) {
  if (!env.TYPESENSE_API_KEY || !env.TYPESENSE_HOST) return null;
  const baseUrl = `${env.TYPESENSE_PROTOCOL}://${env.TYPESENSE_HOST}:${env.TYPESENSE_PORT}`;

  async function request(method, path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'X-TYPESENSE-API-KEY': env.TYPESENSE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) {
      const error = new Error(
        `Typesense ${method} ${path}: ${res.status} ${await res.text()}`,
      );
      error.httpStatus = res.status;
      throw error;
    }
    return res.json();
  }

  const collection = (name) => `/collections/${encodeURIComponent(name)}`;
  return {
    upsertDocument: (name, document) =>
      request('POST', `${collection(name)}/documents?action=upsert`, document),
    deleteDocument: (name, id) =>
      request(
        'DELETE',
        `${collection(name)}/documents/${encodeURIComponent(id)}`,
      ),
    deleteCollection: (name) => request('DELETE', collection(name)),
  };
}
