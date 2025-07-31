import { test as setup, expect } from "../_fixtures/dashboard-test";
import environmentSetupCheck from "../_utils/environment-check";

setup.setTimeout(60_000);

setup("Create test site", async ({ createSite, siteSettingsPage }) => {
  await environmentSetupCheck();
  await createSite();
  await siteSettingsPage.upgradeToPremium();

  await expect(
    siteSettingsPage.page.getByRole("heading").getByText("Premium"),
  ).toBeVisible();

  await siteSettingsPage.customDomainInput.fill("test.localhost:3000");
  await siteSettingsPage.customDomainSaveButton.click();

  await expect(
    siteSettingsPage.page.getByTestId("visit-button"),
  ).toHaveAttribute("href", "http://test.localhost:3000");
});
