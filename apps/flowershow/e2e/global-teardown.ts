import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { teardown } from './helpers/seed';

async function globalTeardown() {
  console.log('🧹 Cleaning up test data...');
  await teardown();
  console.log('✅ Cleanup complete');
}

export default globalTeardown;
