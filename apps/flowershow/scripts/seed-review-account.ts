/**
 * Review account for app directories (OpenAI's ChatGPT plugin review)
 *
 * Reviewers sign in with an email and password, which only this one account
 * can do (lib/review-login.ts). This script makes the password hash for the
 * env, and creates or updates the account with sample sites the review test
 * cases use. Re-running `seed` resets the sample sites' content, so run it
 * before each review.
 *
 * USAGE:
 *
 *   # 1. Hash a password for REVIEW_LOGIN_PASSWORD_HASH. Reads it from stdin
 *   #    so it never lands in shell history:
 *   read -rs PW && printf %s "$PW" | npx tsx scripts/seed-review-account.ts hash; unset PW
 *
 *   # 2. Create or update the account and its sample sites:
 *   REVIEW_LOGIN_EMAIL=review@example.com API_URL=https://flowershow.app \
 *     npx tsx --env-file=.env scripts/seed-review-account.ts seed
 *
 * Then set REVIEW_LOGIN_ENABLED=true, REVIEW_LOGIN_EMAIL and
 * REVIEW_LOGIN_PASSWORD_HASH on the deployment, and give the reviewers the
 * email and password.
 *
 * ENV (seed):
 *   REVIEW_LOGIN_EMAIL   the review account's email
 *   API_URL              Flowershow API origin of the same environment as the
 *                        database, e.g. https://flowershow.app
 *   POSTGRES_PRISMA_URL  that environment's database
 *   REVIEW_USERNAME      username for a new account (default "app-review")
 *
 * The sites are published through the REST API (as the CLI does) with a
 * short-lived token for the account, deleted when the script ends.
 */

import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import type {
  CreateSiteResponse,
  ListSitesResponse,
} from '@flowershow/api-contract';
import { PrismaClient } from '@prisma/client';
import {
  ApiError,
  type PublishDeps,
  type PublishFileInput,
  publish,
} from '@/lib/mcp/publish';
import { hashReviewPassword } from '@/lib/review-password';

// ---------------------------------------------------------------------------
// Sample sites
// ---------------------------------------------------------------------------

const SAMPLE_SITES: { name: string; files: PublishFileInput[] }[] = [
  {
    name: 'reading-notes',
    files: [
      {
        path: 'index.md',
        content: `# Reading Notes

Short notes on books I've read this year.

- [[thinking-in-systems|Thinking in Systems]]
- [[the-pragmatic-programmer|The Pragmatic Programmer]]
`,
      },
      {
        path: 'thinking-in-systems.md',
        content: `# Thinking in Systems

By Donella Meadows.

- A system is more than the sum of its parts: look at the connections.
- Stocks change slowly, through their flows.
- Delays in feedback loops cause overshoot and oscillation.
`,
      },
      {
        path: 'the-pragmatic-programmer.md',
        content: `# The Pragmatic Programmer

By David Thomas and Andrew Hunt.

- Don't live with broken windows.
- Keep knowledge in one place (DRY).
- Use tracer bullets to find the target early.
`,
      },
    ],
  },
  {
    name: 'team-handbook',
    files: [
      {
        path: 'index.md',
        content: `# Team Handbook

How our small team works.

- [[onboarding|Onboarding]]
- [[meetings|Meetings]]
`,
      },
      {
        path: 'onboarding.md',
        content: `# Onboarding

1. Get access to the shared drive and the team chat.
2. Read the last three meeting notes.
3. Pair with a teammate on your first task.
`,
      },
      {
        path: 'meetings.md',
        content: `# Meetings

| Meeting | When | Length |
| --- | --- | --- |
| Weekly planning | Monday 10:00 | 30 min |
| Demo | Friday 15:00 | 45 min |
`,
      },
    ],
  },
  {
    name: 'garden-journal',
    files: [
      {
        path: 'index.md',
        content: `# Garden Journal

What I planted this season and how it grew.

## Spring

- Tomatoes: three varieties, started indoors in March.
- Basil next to the tomatoes.
- Sweet peas along the fence.
`,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

// ---------------------------------------------------------------------------
// REST API client
// ---------------------------------------------------------------------------

/** Publish dependencies that call the REST API with a bearer token. */
function apiDeps(apiUrl: string, token: string): PublishDeps {
  async function call<T>(method: string, path: string, body?: unknown) {
    const res = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body !== undefined && { 'content-type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(
        res.status,
        data?.error,
        data?.message ?? data?.error_description ?? `HTTP ${res.status}`,
      );
    }
    return data as T;
  }

  return {
    async createAnonSite() {
      throw new Error('The review account only publishes account sites.');
    },
    async createUserSite(_userId, name) {
      const { site } = await call<CreateSiteResponse>('POST', '/api/sites', {
        projectName: name,
      });
      return { siteId: site.id, liveUrl: site.url };
    },
    sync: (siteId, files, _credential, options) =>
      call(
        'POST',
        `/api/sites/id/${encodeURIComponent(siteId)}/sync${options.dryRun ? '?dryRun=true' : ''}`,
        { files, mode: options.mode, delete: options.delete },
      ),
    async upload(url, bytes, contentType, publishId) {
      const res = await fetch(url, {
        method: 'PUT',
        body: new Blob([new Uint8Array(bytes)]),
        headers: {
          'content-type': contentType,
          ...(publishId && { 'x-amz-meta-publish-id': publishId }),
        },
      });
      if (!res.ok) {
        throw new ApiError(res.status, 'upload_failed', 'Upload failed');
      }
    },
    status: (siteId) =>
      call('GET', `/api/sites/id/${encodeURIComponent(siteId)}/status`),
    async siteUrl(siteId) {
      const { sites } = await call<ListSitesResponse>('GET', '/api/sites');
      return sites.find((s) => s.id === siteId)?.url ?? '';
    },
    sleep: (ms) => sleep(ms),
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function hash() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const password = Buffer.concat(chunks).toString('utf8');
  if (password.length < 16) {
    console.error('Use a password of at least 16 characters.');
    process.exit(1);
  }
  console.log(await hashReviewPassword(password));
}

async function seed() {
  const email = requireEnv('REVIEW_LOGIN_EMAIL').trim().toLowerCase();
  const apiUrl = requireEnv('API_URL').replace(/\/+$/, '');
  const username = process.env.REVIEW_USERNAME || 'app-review';
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, accounts: { select: { id: true } } },
    });
    // The password login signs in whoever owns REVIEW_LOGIN_EMAIL: refuse to
    // turn a real person's GitHub or Google account into the review account.
    if (existing && existing.accounts.length > 0) {
      console.error(
        `${email} belongs to an account with GitHub or Google sign-in. Use a dedicated email for the review account.`,
      );
      process.exit(1);
    }
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { emailVerified: new Date() },
        })
      : await prisma.user.create({
          data: {
            email,
            username,
            name: 'App Review',
            emailVerified: new Date(),
          },
        });
    console.log(
      `${existing ? 'Updated' : 'Created'} review account ${user.email} (username ${user.username}, id ${user.id})`,
    );

    // A token for this run only; the sync API stores its SHA-256, like
    // hashToken in lib/cli-auth.ts.
    const token = `fs_pat_${randomBytes(32).toString('base64url')}`;
    const accessToken = await prisma.accessToken.create({
      data: {
        token: createHash('sha256').update(token).digest('hex'),
        userId: user.id,
        name: 'seed-review-account',
        type: 'PAT',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    try {
      const deps = apiDeps(apiUrl, token);
      const mode = { kind: 'user', userId: user.id } as const;
      for (const sample of SAMPLE_SITES) {
        const site = await prisma.site.findFirst({
          where: { userId: user.id, projectName: sample.name },
          select: { id: true },
        });
        let confirmDeleteCount: number | undefined;
        if (site) {
          // Reset to the sample content: count the files a replace removes
          // (reviewers' additions) so publish lets it go ahead.
          const dry = await deps.sync(
            site.id,
            [],
            { userId: user.id },
            { mode: 'replace', delete: [], dryRun: true },
          );
          const keep = new Set(sample.files.map((f) => f.path));
          confirmDeleteCount = dry.deleted.filter((p) => !keep.has(p)).length;
        }
        const result = await publish(
          {
            files: sample.files,
            ...(site
              ? { siteId: site.id, replaceWholeSite: true, confirmDeleteCount }
              : { name: sample.name }),
          },
          mode,
          deps,
        );
        const removed = confirmDeleteCount
          ? `, removed ${confirmDeleteCount} added file(s)`
          : '';
        console.log(
          `${sample.name}: ${site ? 'reset' : 'created'}${removed}, ${result.liveUrl}`,
        );
      }
    } finally {
      await prisma.accessToken.delete({ where: { id: accessToken.id } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

const commands: Record<string, () => Promise<void>> = { hash, seed };
const run = commands[process.argv[2] ?? ''];
if (!run) {
  console.error('Usage: npx tsx scripts/seed-review-account.ts hash|seed');
  process.exit(1);
}
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
