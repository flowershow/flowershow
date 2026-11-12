/**
 * Seed the local test environment with one user per plan, so billing and plan
 * behaviour can be tried in a real browser. Idempotent: re-running resets
 * these users' sites and subscriptions to the fixtures below.
 *
 * Only for a local database: refuses any POSTGRES_PRISMA_URL that is not on
 * localhost. Stripe ids here are fake (testenv_*), so Stripe calls for the
 * seeded Premium, Pro and Unlimited users fail; buy a plan as te-buyer to
 * exercise real Stripe test mode.
 *
 * USAGE (from apps/flowershow):
 *   npx tsx --env-file=.env scripts/test-env/seed.ts
 *
 * Then log in as one of them with scripts/test-env/login.ts.
 */
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

type SiteFixture = {
  projectName: string;
  plan?: 'FREE' | 'PREMIUM';
  planSource?: 'SITE' | 'ACCOUNT' | 'MANUAL';
  coveredByAccountPlan?: boolean;
  customDomain?: string;
  siteSubscription?: boolean;
};

type UserFixture = {
  username: string;
  account?: { plan: 'PRO' | 'UNLIMITED'; siteAllowance: number | null };
  sites: SiteFixture[];
};

export const TEST_ENV_USERS: UserFixture[] = [
  {
    username: 'te-free',
    sites: [{ projectName: 'notes' }, { projectName: 'blog' }],
  },
  {
    username: 'te-premium',
    sites: [
      {
        projectName: 'garden',
        plan: 'PREMIUM',
        planSource: 'SITE',
        siteSubscription: true,
        customDomain: 'te-premium.flowershow.local',
      },
      { projectName: 'drafts' },
    ],
  },
  {
    username: 'te-pro',
    account: { plan: 'PRO', siteAllowance: 5 },
    sites: [
      ...['one', 'two', 'three', 'four'].map((name) => ({
        projectName: name,
        plan: 'PREMIUM' as const,
        planSource: 'ACCOUNT' as const,
        coveredByAccountPlan: true,
      })),
      {
        projectName: 'domain',
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
        customDomain: 'te-pro.flowershow.local',
      },
      { projectName: 'spare' },
      {
        projectName: 'own-sub',
        plan: 'PREMIUM',
        planSource: 'SITE',
        siteSubscription: true,
      },
      { projectName: 'granted', plan: 'PREMIUM', planSource: 'MANUAL' },
    ],
  },
  {
    username: 'te-unlimited',
    account: { plan: 'UNLIMITED', siteAllowance: null },
    sites: ['a', 'b', 'c'].map((name) => ({
      projectName: name,
      plan: 'PREMIUM' as const,
      planSource: 'ACCOUNT' as const,
      coveredByAccountPlan: true,
    })),
  },
  {
    // Starts with no plan: buy Pro or Unlimited as this user to run a real
    // Stripe test-mode checkout.
    username: 'te-buyer',
    sites: [{ projectName: 'first' }, { projectName: 'second' }],
  },
];

const YEAR_AHEAD = () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

export function assertLocalDatabase(url: string | undefined): void {
  if (!url) throw new Error('POSTGRES_PRISMA_URL is not set.');
  const host = new URL(url).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(`Refusing to seed a non-local database (${host}).`);
  }
}

async function seedUser(prisma: PrismaClient, fixture: UserFixture) {
  const email = `${fixture.username}@example.test`;
  const user = await prisma.user.upsert({
    where: { username: fixture.username },
    create: { username: fixture.username, email, name: fixture.username },
    update: { email, name: fixture.username, stripeCustomerId: null },
  });

  // Reset: sites cascade to their subscriptions.
  await prisma.site.deleteMany({ where: { userId: user.id } });
  await prisma.accountSubscription.deleteMany({ where: { userId: user.id } });

  if (fixture.account) {
    await prisma.accountSubscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `testenv_cus_${fixture.username}`,
        stripeSubscriptionId: `testenv_sub_${fixture.username}`,
        stripePriceId: `testenv_price_${fixture.account.plan.toLowerCase()}`,
        plan: fixture.account.plan,
        interval: 'year',
        status: 'active',
        siteAllowance: fixture.account.siteAllowance,
        currentPeriodEnd: YEAR_AHEAD(),
      },
    });
  }

  for (const site of fixture.sites) {
    const data: Prisma.SiteUncheckedCreateInput = {
      userId: user.id,
      projectName: site.projectName,
      subdomain: `${site.projectName}-${fixture.username}`,
      plan: site.plan ?? 'FREE',
      planSource: site.planSource ?? null,
      coveredByAccountPlan: site.coveredByAccountPlan ?? false,
      customDomain: site.customDomain ?? null,
    };
    const created = await prisma.site.create({ data });
    if (site.siteSubscription) {
      await prisma.subscription.create({
        data: {
          siteId: created.id,
          stripeCustomerId: `testenv_cus_${created.id}`,
          stripeSubscriptionId: `testenv_sub_${created.id}`,
          stripePriceId: 'testenv_price_premium',
          status: 'active',
          interval: 'year',
          currentPeriodEnd: YEAR_AHEAD(),
        },
      });
    }
  }
  return user;
}

async function main() {
  assertLocalDatabase(process.env.POSTGRES_PRISMA_URL);
  const prisma = new PrismaClient();
  try {
    for (const fixture of TEST_ENV_USERS) {
      await seedUser(prisma, fixture);
      console.log(`seeded ${fixture.username} (${fixture.sites.length} sites)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
