import { WelcomeEmail } from '@/emails/welcome';
import { PremiumUpgradeEmail } from '@/emails/premium-upgrade';

import { SiteCreatedEmail } from '@/emails/site-created';
import { sendEmail } from '@/lib/email';
import { env } from '@/env.mjs';
import { inngest } from '../client';

export const sendWelcomeEmail = inngest.createFunction(
  { id: 'send-welcome-email' },
  { event: 'email/welcome.send' },
  async ({ event }) => {
    const { email, name } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: 'Welcome to Flowershow',
      react: WelcomeEmail({
        userName,
        dashboardUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
      }),
    });

    if (error) {
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);

export const sendPremiumUpgradeEmail = inngest.createFunction(
  { id: 'send-premium-upgrade-email' },
  { event: 'email/premium-upgrade.send' },
  async ({ event }) => {
    const { email, name } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: "You're now on Flowershow Premium",
      react: PremiumUpgradeEmail({
        userName,
        dashboardUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
        discordInviteUrl: env.DISCORD_PREMIUM_INVITE_URL,
      }),
    });

    if (error) {
      throw new Error(`Failed to send premium upgrade email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);

export const sendSiteCreatedEmail = inngest.createFunction(
  { id: 'send-site-created-email' },
  { event: 'email/site-created.send' },
  async ({ event }) => {
    const { email, name, siteUrl, projectName } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: `Your site "${projectName}" is live!`,
      react: SiteCreatedEmail({
        userName,
        siteUrl,
        projectName,
        dashboardUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
        docsUrl: 'https://flowershow.app/docs',
      }),
    });

    if (error) {
      throw new Error(`Failed to send site created email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);
