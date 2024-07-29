import { test, expect } from "@playwright/test";

import "dotenv/config";

test("General layout and config", async ({ page }) => {
  await page.goto(process.env.E2E_TEST_SITE!);

  const navTitle = page.getByTestId("nav-title");
  await expect(navTitle).toBeVisible();
  // This won't work atm becaue the test site is deployed at olayway's account
  // which makes the logo link = datahub.io
  // await expect(navTitle).toHaveAttribute(
  //   "href",
  //   `/${process.env.E2E_TEST_SITE}`,
  // );
  await expect(navTitle).toContainText("Test site title");
  await expect(navTitle.locator("img")).toHaveAttribute("src", /logo.jpeg$/);

  await expect(page.getByTestId("sidebar")).toBeVisible();

  const toc = page.getByTestId("toc");
  await expect(toc).toBeVisible();
  await expect(toc).toContainText("On this page");
  await expect(toc.locator("li").first().locator("li")).toHaveCount(2);
  await expect(toc.locator("li").nth(2).locator("li")).toHaveCount(0);

  const createdBy = page.getByTestId("created-by");
  await expect(createdBy.locator("span")).toContainText("Created by");
  await expect(createdBy.locator("a")).toContainText("Tester Author");
  await expect(createdBy.locator("a")).toHaveAttribute(
    "href",
    "https://datahub.io",
  );
});
