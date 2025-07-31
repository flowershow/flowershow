import { test, expect } from "../_fixtures/dashboard-test";
// Using dynamic import for ES Module compatibility
const randomWord = async () => (await import("random-word")).default();

import "dotenv/config";

test.describe("Dashboard", () => {
  test.describe("Subscription", () => {
    test("should have premium features disabled on free tier", async ({
      siteSettingsPage,
    }) => {
      await siteSettingsPage.goto();

      await expect(siteSettingsPage.customDomainInput).toBeDisabled();
      await expect(siteSettingsPage.fullTextSearchSwitch).toBeDisabled();
    });

    test("should show subscription options on free tier", async ({
      siteSettingsPage,
    }) => {
      await siteSettingsPage.goto();

      await expect(siteSettingsPage.billingMonthlyRadio).toBeVisible();
      await expect(siteSettingsPage.billingAnnuallyRadio).toBeVisible();
      await expect(siteSettingsPage.upgradeButton).toBeVisible();

      // Switch to annual billing works
      await siteSettingsPage.billingAnnuallyRadio.click();
      await expect(siteSettingsPage.billingAnnuallyRadio).toHaveAttribute(
        "data-checked",
      );
    });

    test("should allow upgrading to premium plan", async ({
      siteSettingsPage,
    }) => {
      await siteSettingsPage.goto();
      await siteSettingsPage.upgradeToPremium();

      // Should show Premium badge in heading
      await expect(
        siteSettingsPage.page.getByRole("heading").getByText("Premium"),
      ).toBeVisible();

      // Should show next billing date with renewal info
      await expect(
        siteSettingsPage.page.getByText(/Next billing date/),
      ).toBeVisible();
      await expect(
        siteSettingsPage.page.getByText(/Renews annually/),
      ).toBeVisible(); // Annual plan set above

      await expect(siteSettingsPage.manageSubscriptionButton).toBeVisible();
    });

    test("should have premium features enabled on premium tier", async ({
      siteSettingsPage,
    }) => {
      await siteSettingsPage.goto();

      await expect(siteSettingsPage.customDomainInput).toBeEnabled();

      // Should be able to update custom domain
      const domain = `test.${randomWord()}.com`;
      await siteSettingsPage.customDomainInput.fill(domain);
      await siteSettingsPage.customDomainSaveButton.click();
      await expect(
        siteSettingsPage.page.getByTestId("visit-button"),
      ).toHaveAttribute("href", `http://${domain}`);

      // Should be able to turn on full-text search
      await expect(siteSettingsPage.fullTextSearchSwitch).toBeEnabled();
      await siteSettingsPage.fullTextSearchSwitch.click();
      await expect(siteSettingsPage.fullTextSearchSwitch).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    test("should show subscription warning when trying to delete a site with active subscription", async ({
      siteSettingsPage,
    }) => {
      await siteSettingsPage.goto();
      await siteSettingsPage.delete();

      // Verify subscription warning modal content
      await expect(
        siteSettingsPage.page.getByText(/Active Subscription Warning/i),
      ).toBeVisible();
      await expect(
        siteSettingsPage.page.getByText(
          /This site has an active subscription/i,
        ),
      ).toBeVisible();

      // Verify modal buttons
      await expect(
        siteSettingsPage.page.getByRole("button", { name: /Cancel/i }),
      ).toBeVisible();
      await expect(
        siteSettingsPage.page.getByRole("button", { name: /Delete Site/i }),
      ).toBeVisible();
    });

    test("should allow to cancel subscription", async ({
      siteSettingsPage,
    }) => {
      await siteSettingsPage.goto();
      await siteSettingsPage.manageSubscriptionButton.click();

      await siteSettingsPage.page.waitForResponse((response) =>
        response.url().includes("/api/trpc/stripe.getBillingPortal"),
      );
      // Wait for navigation to Stripe billing portal
      await siteSettingsPage.page.waitForURL((url: URL) =>
        url.toString().includes("billing.stripe.com"),
      );

      await siteSettingsPage.page
        .getByRole("link", { name: /Cancel subscription/i })
        .click();
      await siteSettingsPage.page
        .getByRole("button", { name: /Cancel subscription/i })
        .click();
      await siteSettingsPage.page
        .getByRole("button", { name: /No thanks/i })
        .click();
      await siteSettingsPage.page
        .getByRole("link", { name: /Return to/i })
        .click();

      // Wait for redirect back to settings
      await siteSettingsPage.page.waitForURL((url: URL) =>
        url.toString().includes(`/site/${siteSettingsPage.siteId}/settings`),
      );

      // Verify subscription is cancelled but still active
      await expect(
        siteSettingsPage.page.getByText(/Your subscription will end on/i),
      ).toBeVisible();
    });

    test("should show subscription warning when trying to delete a site with cancelled (but still active) subscription", async ({
      siteSettingsPage,
    }) => {
      await siteSettingsPage.goto();
      await siteSettingsPage.delete();

      // Verify subscription warning modal content
      await expect(
        siteSettingsPage.page.getByText(/Active Subscription Warning/i),
      ).toBeVisible();
      await expect(
        siteSettingsPage.page.getByText(/Scheduled cancellation date/i),
      ).toBeVisible();
    });
  });
});
