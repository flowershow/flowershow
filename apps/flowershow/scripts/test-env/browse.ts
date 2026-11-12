/**
 * Open a dashboard page as a seeded test-env user and save a screenshot plus
 * the page text, so a change can be checked in the real app (by a person or
 * an agent). Uses the storage state written by login.ts.
 *
 * USAGE (from apps/flowershow, with `pnpm dev` running):
 *   npx tsx scripts/test-env/browse.ts te-pro /settings/billing
 *   # -> test-results/test-env/te-pro-settings-billing.png and .txt
 *
 * Maps *.flowershow.local to 127.0.0.1 inside Chromium, so no /etc/hosts
 * entries are needed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

export const CLOUD_ORIGIN = 'http://cloud.flowershow.local:3000';
export const HOST_RULES =
  '--host-resolver-rules=MAP *.flowershow.local 127.0.0.1';

async function main() {
  const [username, pagePath = '/'] = process.argv.slice(2);
  if (!username) throw new Error('Usage: browse.ts <username> [path]');
  const state = path.join(
    'test-results',
    'test-env',
    'auth',
    `${username}.json`,
  );
  if (!fs.existsSync(state)) {
    throw new Error(`No ${state}; run login.ts ${username} first.`);
  }

  const browser = await chromium.launch({ args: [HOST_RULES] });
  try {
    const page = await browser.newPage({ storageState: state });
    const response = await page.goto(`${CLOUD_ORIGIN}${pagePath}`, {
      waitUntil: 'networkidle',
      timeout: 120_000,
    });
    // The analytics consent banner covers the lower left of every page.
    await page
      .getByRole('button', { name: 'No thanks' })
      .click({ timeout: 3_000 })
      .catch(() => {});
    const slug = `${username}${pagePath.replace(/[^a-z0-9]+/gi, '-')}`.replace(
      /-$/,
      '',
    );
    const outDir = path.join('test-results', 'test-env');
    fs.mkdirSync(outDir, { recursive: true });
    await page.screenshot({
      path: path.join(outDir, `${slug}.png`),
      fullPage: true,
    });
    fs.writeFileSync(
      path.join(outDir, `${slug}.txt`),
      await page.locator('body').innerText(),
    );
    console.log(
      `${response?.status()} ${page.url()} -> ${path.join(outDir, slug)}.{png,txt}`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
