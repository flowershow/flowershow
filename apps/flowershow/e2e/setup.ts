import path from 'node:path';
import { test as setup } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { seed } from './helpers/seed';

setup('seed database', async () => {
  console.log('🌱 Seeding test data...');
  await seed();
  console.log('✅ Seed complete');
});
