/**
 * Concurrency check for setSiteCovered against the real local database: with
 * one Pro slot free, cover two sites at the same moment and check that
 * exactly one succeeds and the account never exceeds its allowance.
 *
 * USAGE (from apps/flowershow, with `pnpm dev` running):
 *   npx tsx --env-file=.env scripts/test-env/seed.ts
 *   npx tsx --env-file=.env scripts/test-env/login.ts te-pro
 *   npx tsx --env-file=.env scripts/test-env/race-cover.ts [trials]
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { assertLocalDatabase } from './seed';

const USERNAME = 'te-pro';
const ALLOWANCE = 5;

async function main() {
  const trials = Number(process.argv[2] ?? 10);
  assertLocalDatabase(process.env.POSTGRES_PRISMA_URL);
  const state = JSON.parse(
    fs.readFileSync(
      path.join('test-results', 'test-env', 'auth', `${USERNAME}.json`),
      'utf8',
    ),
  );
  const cookie = state.cookies
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join('; ');

  const setCovered = async (siteId: string, covered: boolean) => {
    const res = await fetch(
      'http://127.0.0.1:3000/api/trpc/stripe.setSiteCovered',
      {
        method: 'POST',
        headers: {
          host: 'cloud.flowershow.local:3000',
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ json: { siteId, covered } }),
      },
    );
    const body = await res.json();
    return body?.error?.json?.data?.code ?? (res.ok ? 'OK' : res.status);
  };

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: USERNAME },
    });
    const site = (projectName: string) =>
      prisma.site.findFirstOrThrow({
        where: { userId: user.id, projectName },
      });
    const one = await site('one');
    const spare = await site('spare');
    const coveredCount = () =>
      prisma.site.count({
        where: { userId: user.id, coveredByAccountPlan: true },
      });

    let failures = 0;
    for (let i = 1; i <= trials; i++) {
      // Free a slot: uncover both contenders, then fill back to 4 of 5.
      await setCovered(spare.id, false);
      await setCovered(one.id, false);
      const before = await coveredCount();
      const results = await Promise.all([
        setCovered(one.id, true),
        setCovered(spare.id, true),
      ]);
      const after = await coveredCount();
      const ok = results.filter((r) => r === 'OK').length;
      const pass = before === ALLOWANCE - 1 && ok === 1 && after === ALLOWANCE;
      if (!pass) failures++;
      console.log(
        `trial ${i}: before ${before}, results ${results.join(' / ')}, after ${after} ${pass ? 'PASS' : 'FAIL'}`,
      );
    }
    console.log(failures ? `${failures} of ${trials} failed` : 'all passed');
    if (failures) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
