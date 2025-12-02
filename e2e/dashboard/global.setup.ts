import { test as setup } from "../_fixtures/dashboard-test";
import environmentSetupCheck from "../_utils/environment-check";

setup.setTimeout(60_000);

setup("Create test site", async ({ createSite }) => {
  await environmentSetupCheck();
  await createSite();
});
