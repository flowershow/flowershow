/**
 * Redeliver Failed GitHub App Webhook Deliveries
 *
 * Fetches all failed webhook deliveries for a GitHub App since a specified
 * date and re-triggers each one via the GitHub API.
 *
 * USAGE:
 *
 *   # Redeliver all failures since 2025-01-01:
 *   GITHUB_APP_ID=123456 GITHUB_PRIVATE_KEY_PATH=./private-key.pem \
 *     npx tsx scripts/redeliver-failed-webhooks.ts --since 2025-01-01
 *
 *   # Dry run (preview what would be redelivered):
 *   DRY_RUN=true ... npx tsx scripts/redeliver-failed-webhooks.ts --since 2025-01-01
 *
 * REQUIREMENTS:
 *   - GITHUB_APP_ID env var
 *   - GITHUB_PRIVATE_KEY or GITHUB_PRIVATE_KEY_PATH env var
 *   - --since <ISO date> CLI argument
 *
 * GitHub API docs:
 *   GET  /app/hook/deliveries
 *   POST /app/hook/deliveries/{delivery_id}/attempts
 */

import { createSign } from 'crypto';
import { readFileSync } from 'fs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const APP_ID = requireEnv('GITHUB_APP_ID');

let privateKey: string;
if (process.env.GITHUB_PRIVATE_KEY) {
  privateKey = process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');
} else if (process.env.GITHUB_PRIVATE_KEY_PATH) {
  privateKey = readFileSync(process.env.GITHUB_PRIVATE_KEY_PATH, 'utf-8');
} else {
  console.error(
    'Missing GITHUB_PRIVATE_KEY or GITHUB_PRIVATE_KEY_PATH env var',
  );
  process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN === 'true';

// Delay between redeliver requests to avoid secondary rate limits (ms)
const REDELIVER_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseSinceArg(): Date {
  const idx = process.argv.indexOf('--since');
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error('Usage: ... --since <ISO date>  e.g. --since 2025-01-01');
    process.exit(1);
  }
  const d = new Date(process.argv[idx + 1]);
  if (isNaN(d.getTime())) {
    console.error(`Invalid date: ${process.argv[idx + 1]}`);
    process.exit(1);
  }
  return d;
}

const SINCE = parseSinceArg();

// ---------------------------------------------------------------------------
// GitHub App JWT
// ---------------------------------------------------------------------------

function generateJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 600,
      iss: parseInt(APP_ID, 10),
    }),
  ).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${header}.${payload}.${signature}`;

  if (process.env.DEBUG_JWT) {
    console.log('\n--- DEBUG JWT ---');
    console.log(jwt);
    console.log('Paste above at https://jwt.io to inspect\n');
  }

  return jwt;
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

const GITHUB_API = 'https://api.github.com';

/** Extracts the cursor value from a GitHub Link header's `rel="next"` URL */
function parseNextCursor(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;
  // Link: <https://api.github.com/app/hook/deliveries?cursor=123&per_page=100>; rel="next"
  const match = linkHeader.match(
    /<[^>]*[?&]cursor=([^&>]+)[^>]*>;\s*rel="next"/,
  );
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

async function githubGet<T>(
  path: string,
  jwt: string,
): Promise<{ data: T; nextCursor: string | undefined }> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${body}`);
  }
  // Preserve large integers (delivery IDs exceed Number.MAX_SAFE_INTEGER)
  const text = await res.text();
  const safe = text.replace(/"id":\s*(\d{16,})/g, '"id":"$1"');
  return {
    data: JSON.parse(safe) as T,
    nextCursor: parseNextCursor(res.headers.get('link')),
  };
}

async function githubPost(path: string, jwt: string): Promise<number> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
    },
  });
  return res.status;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Delivery {
  id: string;
  guid: string;
  delivered_at: string;
  redelivery: boolean;
  duration: number;
  status: string;
  status_code: number;
  event: string;
  action: string | null;
  installation_id: number | null;
  repository_id: number | null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function fetchFailedDeliveries(jwt: string): Promise<Delivery[]> {
  const failed: Delivery[] = [];
  let cursor: string | undefined;
  let page = 1;

  console.log(`Fetching deliveries since ${SINCE.toISOString()} …`);

  while (true) {
    const qs = new URLSearchParams({ per_page: '100' });
    if (cursor !== undefined) qs.set('cursor', String(cursor));

    const { data: deliveries, nextCursor } = await githubGet<Delivery[]>(
      `/app/hook/deliveries?${qs}`,
      jwt,
    );

    if (deliveries.length === 0) break;

    let reachedSince = false;
    for (const d of deliveries) {
      const deliveredAt = new Date(d.delivered_at);
      if (deliveredAt < SINCE) {
        reachedSince = true;
        break;
      }
      if (d.status !== 'OK') {
        failed.push(d);
      }
    }

    console.log(
      `  Page ${page}: ${deliveries.length} deliveries, ${failed.length} failed so far`,
    );

    if (reachedSince || !nextCursor) break;

    cursor = nextCursor;
    page++;

    // Slight pause to be polite to the API
    await sleep(200);
  }

  return failed;
}

async function main() {
  console.log(`GitHub App webhook redelivery`);
  console.log(`  App ID   : ${APP_ID}`);
  console.log(`  Since    : ${SINCE.toISOString()}`);
  console.log(`  Dry run  : ${DRY_RUN}`);
  console.log('');

  const jwt = generateJwt();

  const failed = await fetchFailedDeliveries(jwt);

  console.log(`\nFound ${failed.length} failed deliveries to redeliver.\n`);

  if (failed.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let redelivered = 0;
  let errors = 0;

  for (const d of failed) {
    const label = `[${d.id}] ${d.event}${d.action ? '.' + d.action : ''} @ ${d.delivered_at} (status ${d.status_code})`;

    if (DRY_RUN) {
      console.log(`  DRY RUN would redeliver: ${label}`);
      continue;
    }

    // JWT expires after 10 min; regenerate for long runs
    const freshJwt = generateJwt();
    const status = await githubPost(
      `/app/hook/deliveries/${d.id}/attempts`,
      freshJwt,
    );

    if (status === 202) {
      console.log(`  ✓ Redelivered: ${label}`);
      redelivered++;
    } else {
      console.error(`  ✗ Failed (HTTP ${status}): ${label}`);
      errors++;
    }

    await sleep(REDELIVER_DELAY_MS);
  }

  console.log('\n--- Summary ---');
  if (DRY_RUN) {
    console.log(`Would redeliver: ${failed.length}`);
  } else {
    console.log(`Redelivered : ${redelivered}`);
    console.log(`Errors      : ${errors}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
