import path from 'node:path';
import { test as teardown } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { teardown as dbTeardown } from './helpers/seed';

teardown('cleanup database', async () => {
  console.log('🧹 Cleaning up test data...');
  await dbTeardown();
  console.log('✅ Cleanup complete');
});
