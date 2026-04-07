// scripts/cleanup-legacy-webhooks.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sites = await prisma.site.findMany({
    where: { webhookId: { not: null } },
    select: {
      id: true,
      projectName: true,
      ghRepository: true,
      webhookId: true,
      user: {
        select: {
          accounts: {
            where: { provider: 'github' },
            select: { access_token: true },
            take: 1,
          },
        },
      },
    },
  });

  console.log(`Found ${sites.length} site(s) with legacy webhooks.`);

  let deleted = 0;
  let failed = 0;
  let skipped = 0;

  for (const site of sites) {
    const accessToken = site.user.accounts[0]?.access_token;

    if (!accessToken) {
      console.warn(`[SKIP] ${site.projectName} (${site.id}): no OAuth token`);
      skipped++;
      continue;
    }

    if (!site.ghRepository || !site.webhookId) {
      console.warn(`[SKIP] ${site.projectName} (${site.id}): missing repo or webhookId`);
      skipped++;
      continue;
    }

    const url = `https://api.github.com/repos/${site.ghRepository}/hooks/${site.webhookId}`;

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (res.status === 204 || res.status === 404) {
        // 204 = deleted, 404 = already gone — both are fine
        console.log(`[OK] ${site.projectName}: webhook ${site.webhookId} removed (${res.status})`);
        deleted++;
      } else {
        const body = await res.text();
        console.error(`[FAIL] ${site.projectName}: HTTP ${res.status} — ${body}`);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] ${site.projectName}: ${err}`);
      failed++;
    }
  }

  console.log(`\nDone. deleted=${deleted} skipped=${skipped} failed=${failed}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
