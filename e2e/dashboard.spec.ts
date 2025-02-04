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

  test("should have premium features disabled on free tier", async ({
    page,
  }) => {
    test.fail(!createdSiteId, "Site ID is required for this test");
    await page.goto(`/site/${createdSiteId}/settings`);

    // Get the project name input
    const nameInput = page.locator('input[name="projectName"]');

    // Test invalid characters
    await nameInput.fill("test site!");
    // Click the Save Changes button in the Name form
    await page
      .locator("form", { hasText: "Name" })
      .getByRole("button", { name: "Save Changes" })
      .click();
    await expect(
      page
        .getByRole("status")
        .getByText(
          "Error: Project name can only contain ASCII letters, digits, and the characters -, and _",
        ),
    ).toBeVisible();

    // Test max length (32 chars)
    const longName = "a".repeat(33);
    await nameInput.fill(longName);
    await expect(nameInput).toHaveValue(longName.slice(0, 32));

    // Test valid name update
    const newName = "updated-test-site";
    await nameInput.fill(newName);
    // Click the Save Changes button in the Name form
    await page
      .locator("form", { hasText: "Name" })
      .getByRole("button", { name: "Save Changes" })
      .click();

    // Verify success message
    await expect(
      page.getByRole("status").getByText("Successfully updated projectName!"),
    ).toBeVisible();

    // Verify the input shows the new value
    await expect(nameInput).toHaveValue(newName);
  });
});
