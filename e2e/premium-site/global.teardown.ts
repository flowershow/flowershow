import { test as teardown, expect } from "../_fixtures/dashboard-test";

teardown("Delete the test site", async ({ siteSettingsPage }) => {
  await siteSettingsPage.goto();
  await siteSettingsPage.delete();

  await siteSettingsPage.page
    .getByRole("button", { name: /Delete Site/i })
    .click();
  await expect(siteSettingsPage.page).toHaveURL("/");
});
