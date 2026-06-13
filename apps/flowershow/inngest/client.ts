import { EventSchemas, Inngest } from 'inngest';
import { env } from '@/env.mjs';

/* Types */
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

interface EmailPremiumDowngrade {
  data: {
    userId: string;
    email: string;
    name: string | null;
    extendedEndDate: string | null;
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

interface EmailFeedbackThankYou {
  data: {
    userId: string;
    email: string;
    name: string | null;
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
  'email/welcome.send': EmailWelcome;
  'email/premium-upgrade.send': EmailPremiumUpgrade;
  'email/premium-downgrade.send': EmailPremiumDowngrade;

  'email/site-created.send': EmailSiteCreated;
  'email/feedback-thank-you.send': EmailFeedbackThankYou;
  'email/custom-domain.check': EmailCustomDomainCheck;
};

/* Client */
export const inngest = new Inngest({
  id: `${env.INNGEST_APP_ID}`,
  schemas: new EventSchemas().fromRecord<Events>(),
});
