import prisma from '../server/db';

async function main() {
  const sites = await prisma.site.findMany({
    where: { subdomain: null },
    select: {
      id: true,
      projectName: true,
      user: { select: { username: true } },
    },
  });

  console.log(`Found ${sites.length} sites without subdomains.`);

  let updated = 0;
  let skipped = 0;

  for (const site of sites) {
    const subdomain = `${site.projectName}-${site.user.username}`;
    try {
      await prisma.site.update({
        where: { id: site.id },
        data: { subdomain },
      });
      updated++;
    } catch (err) {
      console.error(
        `Skipping site ${site.id} (${subdomain}): ${(err as Error).message}`,
      );
      skipped++;
    }
  }

  console.log(`Done. Updated: ${updated}, Skipped (conflicts): ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
