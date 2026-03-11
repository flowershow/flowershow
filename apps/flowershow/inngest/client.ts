import { EventSchemas, Inngest } from 'inngest';
import { env } from '@/env.mjs';

/* Types */
interface SiteSync {
  data: {
    siteId: string;
    ghRepository: string;
    ghBranch: string;
    rootDir: string | null;
    accessToken?: string; // Optional for GitHub App installations
    installationId?: string; // For GitHub App installations
    forceSync?: boolean;
  };
}

interface SiteCreate extends SiteSync {}

interface SiteDelete {
  data: {
    siteId: string;
    accessToken: string;
  };
}

interface EmailWelcome {
  data: {
    userId: string;
    email: string;
    name: string | null;
  };
}

interface EmailPremiumUpgrade {
  data: {
    userId: string;
    email: string;
    name: string | null;
  };
}

interface EmailSiteCreated {
  data: {
    userId: string;
    email: string;
    name: string | null;
    siteUrl: string;
    projectName: string;
  };
}

interface EmailCustomDomainCheck {
  data: {
    userId: string;
    email: string;
    name: string | null;
    domain: string;
    siteId: string;
  };
}

/* Events */
type Events = {
  'site/sync': SiteSync;
  'site/create': SiteCreate;
  'site/delete': SiteDelete;
  'email/welcome.send': EmailWelcome;
  'email/premium-upgrade.send': EmailPremiumUpgrade;

  'email/site-created.send': EmailSiteCreated;
  'email/custom-domain.check': EmailCustomDomainCheck;
};

/* Client */
export const inngest = new Inngest({
  id: `${env.INNGEST_APP_ID}`,
  schemas: new EventSchemas().fromRecord<Events>(),
});
