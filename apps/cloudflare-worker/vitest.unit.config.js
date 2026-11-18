import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

// Unit tests run inside workerd with the deployed worker's compatibility date
// and flags (top level of wrangler.flowershow.toml), not in Node: code that
// works in Node can still fail in workerd, e.g. axios >= 1.20 broke every
// Typesense call in production while Node tests passed.
export default defineWorkersConfig({
  test: {
    include: ['test/unit/**/*.test.js'],
    // mammoth's package.json "browser" field swaps out its Node-only file
    // reader (fs, os, path). Wrangler's bundler honours that field; pre-bundle
    // mammoth for the tests so they load the same code.
    deps: {
      optimizer: {
        ssr: { enabled: true, include: ['mammoth'] },
      },
    },
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.flowershow.toml' },
      },
    },
  },
});
