import { test as teardown } from "@playwright/test";
import { deleteProject } from "@/lib/content-store";
import prisma from "@/server/db";

teardown("Delete test site", async ({ context }) => {
  try {
    await context.tracing.start({ snapshots: true });

    // value set in global setup
    const siteId = process.env.SITE_ID;

    // get the created site from the db
    const site = await prisma.site.findFirst({
      where: { id: siteId },
    });

    if (site) {
      await prisma.site.delete({ where: { id: site.id } });
      await deleteProject(site.id);
    }

    await context.tracing.stop({
      path: "./test-results/teardown-trace.zip",
    });
  } catch (error) {
    await context.tracing.stop({
      path: "./test-results/failed-teardown-trace.zip",
    });
    throw error;
  }
});
