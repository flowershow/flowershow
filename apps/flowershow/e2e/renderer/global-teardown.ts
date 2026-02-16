/**
 * Playwright Global Teardown — Renderer E2E Cleanup
 *
 * Removes all test data created by the global setup:
 *   - Deletes the test user (cascades to sites, blobs, subscriptions)
 *   - Cleans up playwright/test-env.json
 */

import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

import { TEST_USER_ID } from './global-setup';

const prisma = new PrismaClient();

export default async function globalTeardown() {
  try {
    console.log('='.repeat(60));
    console.log('Renderer E2E — Global Teardown');
    console.log('='.repeat(60));

    // 1. Delete test user (cascades to sites -> blobs, subscriptions)
    console.log('Deleting test user and all associated data...');
    try {
      await prisma.user.delete({ where: { id: TEST_USER_ID } });
      console.log(`  Deleted user: ${TEST_USER_ID}`);
    } catch (error: unknown) {
      // User may not exist if setup failed
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  User not found (may not have been created): ${message}`);
    }

    // 2. Clean up test-env.json
    const testEnvPath = path.resolve(
      __dirname,
      '../../playwright/test-env.json',
    );
    if (fs.existsSync(testEnvPath)) {
      const env = JSON.parse(fs.readFileSync(testEnvPath, 'utf-8'));
      delete env.freesite;
      delete env.premiumsite;

      if (Object.keys(env).length === 0) {
        fs.writeFileSync(testEnvPath, '{}', 'utf8');
      } else {
        fs.writeFileSync(testEnvPath, JSON.stringify(env, null, 2), 'utf8');
      }
      console.log('  Cleaned test-env.json');
    }

    console.log();
    console.log('Renderer E2E Teardown Complete');
    console.log('='.repeat(60));
  } finally {
    await prisma.$disconnect();
  }
}
