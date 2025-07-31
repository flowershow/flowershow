import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.GH_TEST_ACCOUNT_ID) {
    throw new Error("GH_TEST_ACCOUNT_ID environment variable is required for e2e tests");
  }

  // Upsert the user
  const user = await prisma.user.upsert({
    where: { email: "testuser@example.com" },
    update: {},
    create: {
      name: "E2E Test User",
      username: "E2E Test User",
      ghUsername: "E2E Test User",
      email: "testuser@example.com",
      emailVerified: new Date(),
      role: "USER",
      accounts: {
        create: {
          type: "oauth",
          provider: "github",
          providerAccountId: process.env.GH_TEST_ACCOUNT_ID,
          token_type: "bearer",
          scope: "read:org,read:user,repo,user:email",
        },
      },
    },
  });

  console.log("Seeded E2E user:", user.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
