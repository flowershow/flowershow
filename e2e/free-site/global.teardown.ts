import fs from "fs";
import { test as teardown, expect } from "../_fixtures/dashboard-test";

teardown("Delete the test site", async ({ siteSettingsPage }) => {
  await siteSettingsPage.goto();
  await siteSettingsPage.delete();

  await expect(siteSettingsPage.page).toHaveURL("/");

  // Remove entry from test-env.json
  const envPath = require.resolve("../../playwright/test-env.json");
  const env = JSON.parse(fs.readFileSync(envPath, "utf-8"));
  delete env.freesite;
  fs.writeFileSync(envPath, JSON.stringify(env, null, 2));
});
