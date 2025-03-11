import { test, expect } from "@playwright/test";
import { githubRepo } from "./test-utils";
import { exec as execCallback } from "child_process";
import { promisify } from "util";
const exec = promisify(execCallback);

test.describe("Subscription", () => {
  let createdSiteId: string | null = null;

  test.beforeAll(async ({ browser, request }) => {
    // Check if Stripe CLI webhook forwarding is running
    try {
      const { stdout } = await exec(
        'pgrep -f "stripe listen --forward-to localhost:3000/api/stripe/webhook"',
      );
      if (!stdout.trim()) {
        throw new Error(
          "Stripe CLI webhook forwarding is not running. Please run: stripe listen --forward-to localhost:3000/api/stripe/webhook",
        );
      }
    } catch (error: unknown) {
      // If exec fails with a non-zero exit code (command not found or no process found)
      if (error instanceof Error && "code" in error && error.code === 1) {
        throw new Error(
          "Stripe CLI webhook forwarding is not running. Please run: stripe listen --forward-to localhost:3000/api/stripe/webhook",
        );
      }
      throw error;
    }
    // Create a new context and page
    const context = await browser.newContext();
    const page = await context.newPage();

    // Create a new site and store its ID
    await page.goto("/");
    await page.getByRole("link", { name: /Publish your Markdown/i }).click();
    await expect(page).toHaveURL(/\/new/);
    await expect(page.getByTestId("create-site-form")).toBeVisible();
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

  test("should have premium features disabled on free tier", async ({
    page,
  }) => {
    test.fail(!createdSiteId, "Site ID is required for this test");
    await page.goto(`/site/${createdSiteId}/settings`);

    // Custom domain should be disabled
    await expect(page.locator('input[name="customDomain"]')).toBeDisabled();
    await expect(
      page.getByText("Available on Premium plan only."),
    ).toBeVisible();
  });

  test("should show subscription options on free tier", async ({ page }) => {
    test.fail(!createdSiteId, "Site ID is required for this test");
    await page.goto(`/site/${createdSiteId}/settings/billing`);

    // Verify premium plan details are visible
    await expect(
      page.getByRole("heading", { name: "Current Plan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Upgrade to Premium/i }),
    ).toBeVisible();

    // Check plan frequency options
    await expect(page.getByRole("radio", { name: "Monthly" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Annually" })).toBeVisible();

    // Switch to annual billing
    await page.getByRole("radio", { name: "Annually" }).click();
    await expect(page.getByRole("radio", { name: "Annually" })).toHaveAttribute(
      "data-checked",
    );
  });

  test("should allow upgrading to premium plan", async ({ page }) => {
    test.fail(!createdSiteId, "Site ID is required for this test");
    await page.goto(`/site/${createdSiteId}/settings/billing`);

    // Select annual plan
    await page.getByRole("radio", { name: "Annually" }).click();

    // Click upgrade button and wait for navigation
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes("/api/trpc/stripe.createCheckoutSession"),
      ),
      page.getByRole("button", { name: /Upgrade to Premium/i }).click(),
    ]);

    // Wait for navigation to Stripe and complete checkout
    await page
      .waitForURL(
        (url: URL) => url.toString().includes("checkout.stripe.com"),
        { timeout: 10000 },
      )
      .catch(async (error) => {
        console.log("Current URL:", await page.url());
        console.log("Console errors:", errors);
        throw error;
      });

    // Fill in test card details
    await page.getByLabel("Card number").fill("4242424242424242");
    await page.getByLabel("Expiration").fill("1234");
    await page.getByPlaceholder("CVC").fill("123");
    await page.locator("#billingName").fill("Test User");

    // Complete checkout
    await page.getByRole("button", { name: /Subscribe/i }).click();

    // Wait for redirect back to success page
    await page.waitForURL(
      (url: URL) => url.toString().includes("success=true"),
      { timeout: 20000 },
    );
  });

  test("should show subscription details after upgrade", async ({ page }) => {
    test.fail(!createdSiteId, "Site ID is required for this test");

    await page.goto(`/site/${createdSiteId}/settings`);
    // Should show Premium badge in heading
    await expect(page.getByRole("heading").getByText("Premium")).toBeVisible();

    await page.goto(`/site/${createdSiteId}/settings/billing`);
    // Should show current plan badge
    await expect(page.getByText("Current plan")).toBeVisible();

    // Should show next billing date with renewal info
    await expect(page.getByText(/Next billing date/)).toBeVisible();
    await expect(page.getByText(/Renews annually/)).toBeVisible(); // Annual plan set above

    // Should show manage subscription button instead of upgrade
    await expect(
      page.getByRole("button", { name: /Manage Subscription/i }),
    ).toBeVisible();
  });

  test("should have premium features enabled on premium tier", async ({
    page,
  }) => {
    test.fail(!createdSiteId, "Site ID is required for this test");
    await page.goto(`/site/${createdSiteId}/settings`);

    // Custom domain should be enabled
    const customDomainInput = page.locator('input[name="customDomain"]');
    await expect(customDomainInput).toBeEnabled();

    // Should be able to update custom domain
    await customDomainInput.fill("test.example.com");
    await page
      .locator("form", { has: page.locator('input[name="customDomain"]') })
      .getByRole("button", { name: /Save Changes/i })
      .click();

    // Verify domain was saved
    await expect(customDomainInput).toHaveValue("test.example.com");
  });

  test("should show subscription warning when deleting site with active subscription", async ({
    page,
  }) => {
    test.fail(!createdSiteId, "Site ID is required for this test");

    // Navigate to site settings
    await page.goto(`/site/${createdSiteId}/settings`);

    // Type site name to confirm deletion
    // Get the first heading on the page which should be the site name
    const siteName = await page.getByTestId("site-name").first().textContent();
    await page
      .getByTestId("delete-site-input")
      .fill(siteName?.replace("Delete Site", "").trim() || "");

    // Click delete button and verify warning modal appears
    await page.getByRole("button", { name: /Confirm Delete/i }).click();

    // Verify subscription warning modal content
    await expect(page.getByText("Active Subscription Warning")).toBeVisible();
    await expect(
      page.getByText(/This site has an active subscription/),
    ).toBeVisible();
    await expect(page.getByText(/Next billing date/)).toBeVisible();
    await expect(page.getByText(/Billing period: Annually/)).toBeVisible();

    // Verify modal buttons
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete Site" }),
    ).toBeVisible();

    // Click delete and verify redirect
    await page.getByRole("button", { name: "Delete Site" }).click();
    await expect(page).toHaveURL("/");
  });
});
