import { test as setup, expect } from "@playwright/test";
import { CLOUD_BASE_URL, GH_USERNAME, GH_REPOSITORY } from "./constants";
import { Site } from "@prisma/client";

setup("Create test site", async ({ page, context }) => {
  try {
    await context.tracing.start({ screenshots: true, snapshots: true });
    await page.goto(CLOUD_BASE_URL);
    await page.getByRole("button", { name: "Create New Site" }).click();
    await expect(page.getByTestId("create-site-form")).toBeVisible();
    await page.waitForLoadState(); // wait for form data to load
    await page
      .getByLabel("GitHub Account")
      .selectOption({ value: GH_USERNAME });
    await page.waitForLoadState(); // wait for repos to load
    await page
      .getByLabel("Repository")
      .selectOption({ value: `${GH_USERNAME}/${GH_REPOSITORY}` });
    // Note: if the test fails here, it's likely because you haven't created your test repo yet (see README)
    await page.getByRole("button", { name: "Create Site" }).click();
    const response = await page.waitForResponse(
      "**/api/trpc/site.create?batch=1",
    );
    const site = (await response.json())[0].result.data.json as Site;

    // TODO better way to share site between tests
    process.env.E2E_SITE_ID = site.id.toString();
    console.log("E2E_SITE_ID", process.env.E2E_SITE_ID);

    await page.waitForURL(`${CLOUD_BASE_URL}/site/${site.id}/settings`);

    await context.tracing.stop({
      path: "./test-results/setup-trace.zip",
    });
  } catch (error) {
    await context.tracing.stop({
      path: "./test-results/failed-setup-trace.zip",
    });
    throw error;
  }
});

// TODO make this work
// import { appRouter } from "@/server/api/root";
// import { createTRPCContext } from "@/server/api/trpc";

// setup("Create test site", async ({ context }) => {

//   const ctx = await createTRPCContext({
//     headers: new Headers({
//       cookie: context.cookies().toString(),
//       "x-trpc-source": "rsc",
//     }),
//   });

//   const caller = appRouter.createCaller(ctx);

//   try {
//     const site =
//       caller.site.create({
//         gh_repository: GH_REPOSITORY!,
//         gh_branch: "main",
//         gh_scope: GH_USERNAME!,
//       });

//     console.log("site", site);

//   } catch (error) {
//     throw error;
//   }
// });
