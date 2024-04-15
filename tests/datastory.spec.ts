import { test, expect } from "@playwright/test";
import { BASE_URL } from "./constants";

import prisma from "@/server/db";
import { Site } from "@prisma/client";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

let site: SiteWithUser | null = null;

test.describe("Datastory page", () => {
  test.beforeAll(async () => {
    const siteId = process.env.E2E_SITE_ID;

    // TODO get from shared json?
    site = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
      include: {
        user: true,
      },
    });
    if (!site) {
      throw new Error(`Site with id ${siteId} not found`);
    }
  });

  test("Datastory layout", async ({ page }) => {
    // TODO replace hardcoded values with values from json
    await page.goto(
      `${BASE_URL}/@${site!.user!.gh_username}/${site!.projectName}/blog`,
    );
    await page.waitForLoadState();
    expect(
      await page.getByRole("heading", { name: "Blog home page" }).count(),
    ).toBe(1);
    await expect(page.locator("h1").first()).toHaveText("Blog home page");
  });
});
