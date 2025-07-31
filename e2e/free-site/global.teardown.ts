import { test as teardown, expect } from "../_fixtures/dashboard-test";

teardown("Delete the test site", async ({ siteSettingsPage }) => {
  await siteSettingsPage.goto();
  await siteSettingsPage.delete();
});
