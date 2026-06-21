import { S3Client } from '@aws-sdk/client-s3';
import postgres from 'postgres';
import { Client } from 'typesense';

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

export function getTypesenseClient(env) {
  if (!env.TYPESENSE_API_KEY || !env.TYPESENSE_HOST) return null;
  return new Client({
    nodes: [
      {
        host: env.TYPESENSE_HOST,
        port: Number.parseInt(env.TYPESENSE_PORT, 10),
        protocol: env.TYPESENSE_PROTOCOL,
      },
    ],
    apiKey: env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 2,
  });
}
