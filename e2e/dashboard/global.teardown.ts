import fs from "fs";
import { test as teardown, expect } from "../_fixtures/dashboard-test";

teardown.use({ baseURL: `http://${process.env.NEXT_PUBLIC_CLOUD_DOMAIN}` });

teardown("Delete the test site", async ({ siteSettingsPage }) => {
  await siteSettingsPage.goto();
  await siteSettingsPage.delete();

  await siteSettingsPage.page
    .getByRole("button", { name: /Delete Site/i })
    .click();
  await expect(siteSettingsPage.page).toHaveURL("/");

  // Remove entry from test-env.json
  const envPath = require.resolve("../../playwright/test-env.json");
  const env = JSON.parse(fs.readFileSync(envPath, "utf-8"));
  delete env.dashboard;
  fs.writeFileSync(envPath, JSON.stringify(env, null, 2));
});
