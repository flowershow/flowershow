import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { cleanupExpiredSites, deleteSite, syncSite } from '@/inngest/functions';
import {
  checkCustomDomainAndNotify,
  sendFeedbackThankYouEmail,
  sendWelcomeEmail,
  sendPremiumUpgradeEmail,
  sendSiteCreatedEmail,
} from '@/inngest/functions/email';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncSite,
    deleteSite,
    cleanupExpiredSites,
    sendWelcomeEmail,
    sendPremiumUpgradeEmail,
    sendSiteCreatedEmail,
    sendFeedbackThankYouEmail,
    checkCustomDomainAndNotify,
  ],
});
