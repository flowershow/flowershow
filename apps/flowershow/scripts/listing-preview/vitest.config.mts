// Static preview harness for list blocks (no Storybook, no database, no Next server).
// Build:   npx vitest run --config scripts/listing-preview/vitest.config.mts   (or pnpm preview:listings)
// Shots:   node scripts/listing-preview/capture.mjs                           (or pnpm preview:listings:shots)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

process.env.SKIP_ENV_VALIDATION ??= 'true';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

export default defineConfig({
  root,
  plugins: [tsconfigPaths(), react()],
  resolve: { alias: { '@': root } },
  test: {
    environment: 'node',
    include: ['scripts/listing-preview/*.preview.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 120_000,
  },
});
