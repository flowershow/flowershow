import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { seed } from './helpers/seed';

async function globalSetup() {
  console.log('🌱 Seeding test data...');
  await seed();
  console.log('✅ Seed complete');
}

export default globalSetup;
