import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  cleanupExpiredPublishFiles,
  cleanupExpiredSites,
  deleteSite,
} from '@/inngest/functions';
import {
  checkCustomDomainAndNotify,
  sendFeedbackThankYouEmail,
  sendWelcomeEmail,
  sendPremiumDowngradeEmail,
  sendPremiumUpgradeEmail,
  sendSiteCreatedEmail,
} from '@/inngest/functions/email';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    deleteSite,
    cleanupExpiredSites,
    cleanupExpiredPublishFiles,
    sendWelcomeEmail,
    sendPremiumUpgradeEmail,
    sendPremiumDowngradeEmail,
    sendSiteCreatedEmail,
    sendFeedbackThankYouEmail,
    checkCustomDomainAndNotify,
  ],
});
