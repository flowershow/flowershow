/**
 * Playwright Global Setup — Renderer E2E Seed
 *
 * Seeds the database directly with test data for renderer E2E tests,
 * then triggers Inngest sync events and polls until all blobs reach SUCCESS.
 *
 * This bypasses the dashboard UI entirely — no browser needed for setup.
 *
 * REQUIREMENTS:
 *   - Database connection must be configured (.env)
 *   - GH_ACCESS_TOKEN must be set in .env
 *   - INNGEST_APP_ID must be set in .env
 *   - GH_E2E_TEST_ACCOUNT must be set in .env
 *   - Inngest dev server must be running (for sync events)
 *   - Cloudflare worker must be running (local only)
 *
 * WHAT IT DOES:
 *   1. Checks required services are reachable
 *   2. Upserts a test user and two sites (free + premium) directly in the DB
 *   3. Creates a mock Stripe subscription for the premium site
 *   4. Sends Inngest "site/sync" events with forceSync
 *   5. Polls the database every 3s until all blobs reach SUCCESS
 *   6. Writes site details to playwright/test-env.json for test fixtures
 *   7. Times out after 120s if syncs have not completed
 */

import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { Inngest, EventSchemas } from 'inngest';
import 'dotenv/config';

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

// Standalone Inngest client — avoids importing from inngest/client.ts
// which pulls in env.mjs and validates ALL env vars.
const inngest = new Inngest({
  id: process.env.INNGEST_APP_ID || 'my-app',
  schemas: new EventSchemas().fromRecord<{
    'site/sync': {
      data: {
        siteId: string;
        ghRepository: string;
        ghBranch: string;
        rootDir: string | null;
        accessToken?: string;
        installationId?: string;
        forceSync?: boolean;
      };
    };
  }>(),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TEST_USER_ID = 'e2e-renderer-user';
const TEST_USER_NAME = 'E2E Renderer Test User';
const TEST_USERNAME = 'e2e-renderer';

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

// Premium site Stripe mock constants
const MOCK_STRIPE_CUSTOMER_ID = 'cus_e2e_renderer_test';
const MOCK_STRIPE_SUBSCRIPTION_ID = 'sub_e2e_renderer_test';
const MOCK_STRIPE_PRICE_ID = 'price_e2e_renderer_test';

interface SiteDefinition {
  projectName: string;
  ghRepository: string;
  ghBranch: string;
  rootDir: string | null;
  plan: 'FREE' | 'PREMIUM';
  customDomain?: string;
}

function getSiteDefinitions(): SiteDefinition[] {
  const account = process.env.GH_E2E_TEST_ACCOUNT;
  if (!account) {
    throw new Error('GH_E2E_TEST_ACCOUNT is not set in the environment.');
  }

  return [
    {
      projectName: `e2e-free-${account}`,
      ghRepository: `${account}/test`,
      ghBranch: 'main',
      rootDir: null,
      plan: 'FREE',
    },
    {
      projectName: `e2e-premium-${account}`,
      ghRepository: `${account}/test`,
      ghBranch: 'main',
      rootDir: null,
      plan: 'PREMIUM',
      customDomain: 'test.localhost:3000',
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkService(name: string, url: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`  ${name}: OK (${url})`);
  } catch {
    throw new Error(
      `${name} is not reachable at ${url}.\n` +
        '  Start the full dev stack before running renderer tests.',
    );
  }
}

async function printBlobStatus(siteIds: string[]) {
  const blobs = await prisma.blob.findMany({
    where: { siteId: { in: siteIds } },
    select: { siteId: true, path: true, syncStatus: true, syncError: true },
  });

  if (blobs.length === 0) {
    console.log('  No blobs found for any site.');
    return;
  }

  console.log('\n  Final blob status:');
  for (const blob of blobs) {
    const errorInfo = blob.syncError ? ` - ${blob.syncError}` : '';
    console.log(
      `    ${blob.syncStatus} | ${blob.path} (siteId=${blob.siteId})${errorInfo}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Global Setup (seed)
// ---------------------------------------------------------------------------

export default async function globalSetup() {
  try {
    const accessToken = process.env.GH_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('GH_ACCESS_TOKEN is not set in the environment.');
    }

    const account = process.env.GH_E2E_TEST_ACCOUNT;
    if (!account) {
      throw new Error('GH_E2E_TEST_ACCOUNT is not set in the environment.');
    }

    console.log('='.repeat(60));
    console.log('Renderer E2E Seed — Global Setup');
    console.log('='.repeat(60));
    console.log();

    // 0. Check required services are running (local only)
    if (!process.env.CI) {
      console.log('Checking required services...');
      await checkService('Inngest dev server', 'http://localhost:8288');
      await checkService('Cloudflare Worker', 'http://localhost:8787/health');
      console.log();
    }

    // 1. Upsert user
    console.log('Creating test user...');
    const user = await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {
        name: TEST_USER_NAME,
        username: TEST_USERNAME,
        ghUsername: account,
      },
      create: {
        id: TEST_USER_ID,
        name: TEST_USER_NAME,
        username: TEST_USERNAME,
        ghUsername: account,
      },
    });
    console.log(`  User: ${user.id} (${user.username})`);

    // 2. Upsert sites
    console.log('Creating test sites...');
    const siteDefinitions = getSiteDefinitions();

    const createdSites: Array<{
      id: string;
      projectName: string;
      ghRepository: string;
      ghBranch: string;
      rootDir: string | null;
      plan: 'FREE' | 'PREMIUM';
      customDomain?: string;
    }> = [];

    for (const def of siteDefinitions) {
      const site = await prisma.site.upsert({
        where: { subdomain: def.projectName },
        update: {
          ghRepository: def.ghRepository,
          ghBranch: def.ghBranch,
          rootDir: def.rootDir,
          plan: def.plan,
          customDomain: def.customDomain ?? null,
        },
        create: {
          ghRepository: def.ghRepository,
          ghBranch: def.ghBranch,
          rootDir: def.rootDir,
          projectName: def.projectName,
          subdomain: def.projectName,
          userId: user.id,
          plan: def.plan,
          customDomain: def.customDomain ?? null,
        },
      });

      // Create mock subscription for premium sites
      if (def.plan === 'PREMIUM') {
        await prisma.subscription.upsert({
          where: { siteId: site.id },
          update: {
            status: 'active',
            stripePriceId: MOCK_STRIPE_PRICE_ID,
            interval: 'year',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
          create: {
            siteId: site.id,
            stripeCustomerId: MOCK_STRIPE_CUSTOMER_ID,
            stripeSubscriptionId: MOCK_STRIPE_SUBSCRIPTION_ID,
            stripePriceId: MOCK_STRIPE_PRICE_ID,
            status: 'active',
            interval: 'year',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
        console.log(`  Subscription: mock active (${site.id})`);
      }

      createdSites.push({
        id: site.id,
        projectName: site.projectName,
        ghRepository: def.ghRepository,
        ghBranch: def.ghBranch,
        rootDir: def.rootDir,
        plan: def.plan,
        customDomain: def.customDomain,
      });
      console.log(`  Site: ${site.id} (${site.projectName}) [${def.plan}]`);
    }

    // 3. Trigger Inngest sync events
    console.log();
    console.log('-'.repeat(60));
    console.log('Triggering Inngest site/sync events...');
    console.log('-'.repeat(60));

    for (const site of createdSites) {
      try {
        await inngest.send({
          name: 'site/sync',
          data: {
            siteId: site.id,
            ghRepository: site.ghRepository,
            ghBranch: site.ghBranch,
            rootDir: site.rootDir,
            accessToken,
            forceSync: true,
          },
        });
        console.log(`  Sent site/sync for: ${site.projectName} (${site.id})`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Could not send Inngest event for ${site.projectName}: ${message}\n` +
            'Is the Inngest dev server running?',
        );
      }
    }

    // 4. Poll until all syncs complete
    console.log();
    console.log('-'.repeat(60));
    console.log('Polling for sync completion...');
    console.log('-'.repeat(60));

    const startTime = Date.now();
    const siteIds = createdSites.map((s) => s.id);

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed > POLL_TIMEOUT_MS) {
        await printBlobStatus(siteIds);
        throw new Error(
          `Sync timed out after ${POLL_TIMEOUT_MS / 1000} seconds.`,
        );
      }

      await sleep(POLL_INTERVAL_MS);

      const allBlobs = await prisma.blob.findMany({
        where: { siteId: { in: siteIds } },
        select: {
          siteId: true,
          path: true,
          syncStatus: true,
          syncError: true,
        },
      });

      if (allBlobs.length === 0) {
        const elapsedSec = Math.round(elapsed / 1000);
        console.log(`  [${elapsedSec}s] No blobs yet, waiting...`);
        continue;
      }

      const pending = allBlobs.filter(
        (b) => b.syncStatus === 'UPLOADING' || b.syncStatus === 'PROCESSING',
      );
      const success = allBlobs.filter((b) => b.syncStatus === 'SUCCESS');
      const errors = allBlobs.filter((b) => b.syncStatus === 'ERROR');

      const elapsedSec = Math.round(elapsed / 1000);
      console.log(
        `  [${elapsedSec}s] Blobs: ${allBlobs.length} total, ` +
          `${success.length} SUCCESS, ${pending.length} pending, ${errors.length} ERROR`,
      );

      if (errors.length > 0) {
        const details = errors
          .map((b) => `  - ${b.path} (siteId=${b.siteId}): ${b.syncError}`)
          .join('\n');
        throw new Error(`One or more blobs failed to sync:\n${details}`);
      }

      if (pending.length === 0 && success.length === allBlobs.length) {
        console.log(
          `\nAll ${allBlobs.length} blobs synced successfully in ${elapsedSec}s.`,
        );
        break;
      }
    }

    // 5. Write test-env.json for test fixtures
    const testEnvPath = path.resolve(
      __dirname,
      '../../playwright/test-env.json',
    );
    const freeSite = createdSites.find((s) => s.plan === 'FREE')!;
    const premiumSite = createdSites.find((s) => s.plan === 'PREMIUM')!;

    const testEnv = {
      freesite: {
        siteId: freeSite.id,
        siteName: freeSite.projectName,
      },
      premiumsite: {
        siteId: premiumSite.id,
        siteName: premiumSite.projectName,
      },
    };

    fs.mkdirSync(path.dirname(testEnvPath), { recursive: true });
    fs.writeFileSync(testEnvPath, JSON.stringify(testEnv, null, 2), 'utf8');
    console.log(`  Wrote test-env.json: ${testEnvPath}`);

    // 6. Summary
    console.log();
    console.log('='.repeat(60));
    console.log('Renderer E2E Seed Complete');
    console.log('='.repeat(60));
    console.log(`  User:     ${user.username} (${user.id})`);
    console.log(`  Sites:    ${createdSites.length}`);
    for (const site of createdSites) {
      const domainInfo = site.customDomain
        ? ` [custom: ${site.customDomain}]`
        : '';
      console.log(
        `    - ${site.projectName} (${site.id}) [${site.plan}]${domainInfo}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
