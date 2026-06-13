import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
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
    sendWelcomeEmail,
    sendPremiumUpgradeEmail,
    sendPremiumDowngradeEmail,
    sendSiteCreatedEmail,
    sendFeedbackThankYouEmail,
    checkCustomDomainAndNotify,
  ],
});
