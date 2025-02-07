import { test, expect, chromium } from "@playwright/test";
import { githubScope, githubRepo } from "./test-utils";

test.describe("Dashboard", () => {
  let createdSiteId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    // Create a new context and page
    const context = await browser.newContext();
    const page = await context.newPage();

    // Create a new site and store its ID
    await page.goto("/sites");
    await page.getByRole("button", { name: /Create New Site/i }).click();
    await expect(page.getByTestId("create-site-modal")).toBeVisible();
    await page.getByLabel("Repository").selectOption(githubRepo);
    await page.getByRole("button", { name: /Create Site/i }).click();

    // Extract the site ID from URL
    await expect(page).toHaveURL(/\/site\/[a-z0-9]+\/settings/);
    const url = page.url();
    const match = url.match(/\/site\/([a-z0-9]+)\/settings/);
    if (match?.[1]) {
      createdSiteId = match[1];
    } else {
      throw new Error("Failed to extract site ID from URL");
    }

    // Close the context
    await context.close();
  });

  test.afterAll(async ({ request }) => {
    if (createdSiteId) {
      try {
        // Delete site using API endpoint directly
        await request.post(`/api/trpc/site.delete`, {
          data: {
            json: {
              id: createdSiteId,
            },
          },
        });

        // Reset the site ID
        createdSiteId = null;
      } catch (error) {
        console.error("Failed to cleanup test site:", error);
        throw error; // Re-throw to ensure test failure if cleanup fails
      }
    }
  });

  test("should display user sites", async ({ page }) => {
    await page.goto("/sites");

    // Check if we're on the dashboard page
    await expect(
      page.getByRole("heading", { name: "All Sites" }),
    ).toBeVisible();

    // Verify dashboard navigation is present
    await expect(page.getByTestId("dashboard-sidebar")).toBeVisible();
  });

  test("should validate and update site name", async ({ page }) => {
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
