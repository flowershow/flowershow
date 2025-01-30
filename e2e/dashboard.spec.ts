import { test, expect } from "@playwright/test";
import { githubScope, githubRepo } from "./test-utils";

test.describe("Dashboard @auth", () => {
  test("should display user sites", async ({ page }) => {
    await page.goto("/sites");

    // Check if we're on the dashboard page
    await expect(
      page.getByRole("heading", { name: "All Sites" }),
    ).toBeVisible();

    // Verify dashboard navigation is present
    await expect(page.getByTestId("dashboard-sidebar")).toBeVisible();
  });

  test("should allow creating a new site", async ({ page }) => {
    await page.goto("/sites");

    // Click create site button
    await page.getByRole("button", { name: /Create New Site/i }).click();

    // Wait for modal to appear
    await expect(page.getByTestId("create-site-modal")).toBeVisible();

    // Fill in site details
    await page.getByLabel("Repository").selectOption(githubRepo);

    // Submit form
    await page.getByRole("button", { name: /Create Site/i }).click();

    // Verify URL format matches /site/[id]/settings where id is a dynamic value
    await expect(page).toHaveURL(/\/site\/[a-z0-9]+\/settings/);
  });
});
