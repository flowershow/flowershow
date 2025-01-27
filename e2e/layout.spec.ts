import { test, expect } from "@playwright/test";
import { testSite } from "./test-utils";

test("General layout and config", async ({ page }) => {
  await page.goto(testSite);

  const navTitle = page.getByTestId("nav-title");
  await expect(navTitle).toBeVisible();
  // This won't work atm becaue the test site is deployed at olayway's account
  // which makes the logo link = datahub.io
  // await expect(navTitle).toHaveAttribute(
  //   "href",
  //   `/${testSite}`,
  // );
  await expect(navTitle).toContainText("Test site title");
  await expect(navTitle.locator("img")).toHaveAttribute("src", /logo.jpeg$/);

  await expect(page.getByTestId("sidebar")).toBeVisible();

  const toc = page.getByTestId("toc");
  await expect(toc).toBeVisible();
  await expect(toc).toContainText("On this page");
  await expect(toc.locator("li").nth(0).locator("li")).toHaveCount(0);
  await expect(toc.locator("li").nth(1).locator("li")).toHaveCount(1);
});
