import { test as setup } from '../_fixtures/dashboard-test';
import environmentSetupCheck from '../_utils/environment-check';

setup.setTimeout(75_000);

setup('Create test site', async ({ createSite }) => {
  await environmentSetupCheck();
  await createSite();
});
