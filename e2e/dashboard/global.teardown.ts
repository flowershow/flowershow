import { test as teardown, expect } from "../_fixtures/dashboard-test";

teardown.use({ baseURL: `http://${process.env.NEXT_PUBLIC_CLOUD_DOMAIN}` });

teardown("Delete the test site", async ({ siteSettingsPage }) => {
  await siteSettingsPage.goto();
  await siteSettingsPage.delete();

  await siteSettingsPage.page
    .getByRole("button", { name: /Delete Site/i })
    .click();
  await expect(siteSettingsPage.page).toHaveURL("/");
});
